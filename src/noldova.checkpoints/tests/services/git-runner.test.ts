/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buffer } from "node:stream/consumers";
import { describe, it, mock, type TestContext } from "node:test";
import { setImmediate } from "node:timers/promises";

import "@noldova/context.core";
import { ProcessRequest, type OwnedProcess } from "@noldova/desktop.runtime";

import { GitExitedException, GitStoppedException } from "../../src/api/index.ts";
import { FolderStore } from "../../src/models/folder-store.ts";
import { GitLimits } from "../../src/models/git-limits.ts";
import { GitBuildLocator } from "../../src/services/git-build.locator.ts";
import { GitRunner } from "../../src/services/git-runner.ts";
import { CheckpointsContext } from "../fixtures/checkpoints-context.fixture.ts";
import { ManualClock } from "../fixtures/manual-clock.fixture.ts";

class ScriptContext extends CheckpointsContext {
  private readonly script: string;
  private readonly stops: (() => number)[] = [];

  public constructor(t: TestContext, moduleFolder: string, script: string) {
    super(t, moduleFolder);
    this.script = script;
  }

  public get stopped(): number {
    return this.stops.reduce((total, u) => total + u(), 0);
  }

  protected override async startAsync(request: ProcessRequest): Promise<OwnedProcess> {
    const owned = await super.startAsync(new ProcessRequest(process.execPath, ["-e", this.script], request.workingFolder, request.environment, [], request.signal));
    const stops = mock.method(owned, "stopAsync");
    this.stops.push(() => stops.mock.callCount());
    return owned;
  }
}

class RefusingContext extends CheckpointsContext {
  private hasRefused: boolean = false;

  public readonly refusal: Error = new Error("The system refused to start a program.");

  protected override async startAsync(request: ProcessRequest): Promise<OwnedProcess> {
    if (!this.hasRefused) {
      this.hasRefused = true;
      throw this.refusal;
    }
    return await super.startAsync(request);
  }
}

class LateContext extends CheckpointsContext {
  public beforeStart: () => void = () => undefined;

  protected override async startAsync(request: ProcessRequest): Promise<OwnedProcess> {
    this.beforeStart();
    return await super.startAsync(request);
  }
}

const uncancelled: AbortSignal = new AbortController().signal;

const limits: GitLimits = new GitLimits(60_000, 60_000, 600_000, 10_000);

const startAsync = async (t: TestContext): Promise<[GitRunner, FolderStore, CheckpointsContext, (other: GitRunner) => GitRunner]> => {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "git-runner-")));
  const context = new CheckpointsContext(t, root);
  const git = new GitRunner(context, await new GitBuildLocator(import.meta.dirname).locateAsync(process.platform, process.arch), limits, new ManualClock());
  const runners = [git];
  t.after(async () => {
    for (const each of runners)
      await each.stopAllAsync();
    await rm(root, { recursive: true, force: true });
  });
  await writeFile(path.join(root, "empty"), "");
  const keep = (other: GitRunner): GitRunner => {
    runners.push(other);
    return other;
  };
  return [git, await initAsync(git, root, "project-1"), context, keep];
};

const initAsync = async (git: GitRunner, root: string, identity: string): Promise<FolderStore> => {
  const store = new FolderStore(root, identity);
  await mkdir(store.folder, { recursive: true });
  await git.runAsync(store, "init", ["--bare", "--quiet", "--template="], "", uncancelled);
  return store;
};

const commitOf = (reference: string): string => `commit ${reference}\nmark :1\ncommitter Probe <probe@host-1.example> 0 +0000\ndata 0\n`;

describe("GitRunner", { concurrency: true }, () => {
  it("starts the build's Git once with --version in its exec path, on no store, gives the time it took, and fails as a command does when it exits with an error", async t => {
    const root = await realpath(await mkdtemp(path.join(tmpdir(), "git-runner-")));
    t.after(() => rm(root, { recursive: true, force: true }));
    const build = await new GitBuildLocator(import.meta.dirname).locateAsync(process.platform, process.arch);
    const context = new CheckpointsContext(t, root);
    const clock = new ManualClock();
    context.watchStart = () => clock.tick(250);

    const took = await new GitRunner(context, build, limits, clock).startOnceAsync(root, uncancelled);
    const failed = new GitRunner(new ScriptContext(t, root, "process.exit(3)"), build, limits, new ManualClock()).startOnceAsync(root, uncancelled);

    const request = context.requests[0];
    assert.deepEqual([request?.program, request?.arguments.join(" "), request?.workingFolder], [build.program, "--version", build.execPath]);
    assert.equal(took, 250);
    await assert.rejects(failed, (error: unknown) => error instanceof GitExitedException && error.command === "--version" && error.exitCode === 3);
  });

  it("runs the build in the store's folder, with an environment that keeps the person's and the system's configuration out", async t => {
    const [git, store, context] = await startAsync(t);

    const request = context.requests[0];
    assert.equal(request?.workingFolder, store.folder);
    assert.equal(request?.arguments[0], "init");
    assert.deepEqual(Object.keys(request?.environment ?? {}).sort(), [
      "GIT_ATTR_NOSYSTEM", "GIT_CONFIG_GLOBAL", "GIT_CONFIG_NOSYSTEM", "GIT_DIR", "GIT_EXEC_PATH", "GIT_NO_REPLACE_OBJECTS", "GIT_TERMINAL_PROMPT",
      "HOME", "LC_ALL", "PATH", "XDG_CONFIG_HOME"
    ]);
    assert.equal(request?.environment["GIT_DIR"], store.gitFolder);
    assert.equal(request?.environment["GIT_CONFIG_GLOBAL"], store.emptyFile);
    assert.equal(request?.environment["HOME"], store.moduleFolder);
    assert.equal(request?.environment["GIT_TERMINAL_PROMPT"], "0");
    const fields = (await git.runAsync(store, "config", ["--list", "--show-origin", "--null"], "", uncancelled)).toString("utf8").split("\0").filter(u => u !== "");
    const files = new Set(fields.filter((_, index) => index % 2 === 0).map(u => u.replaceAll("\\", "/")));
    assert.deepEqual([...files], [`file:${store.configFile.replaceAll("\\", "/")}`]);
  });

  it("runs a build that holds no CA bundle, on a store that has no remote", async t => {
    const [git, store] = await startAsync(t);
    const build = await new GitBuildLocator(import.meta.dirname).locateAsync(process.platform, process.arch);
    let folder = path.dirname(build.program);
    while (!existsSync(path.join(path.dirname(folder), "package.json")) && path.dirname(folder) !== folder)
      folder = path.dirname(folder);
    const bundles = (await readdir(folder, { recursive: true })).map(u => path.basename(u)).filter(u => /^(?:ca)?cert\.pem$|\.crt$/.test(u));

    assert.deepEqual([bundles, (await git.runAsync(store, "remote", [], "", uncancelled)).toString("utf8")], [[], ""]);
  });

  it("writes a command's input and gives its output, starting it with a stop signal that hasn't aborted", async t => {
    const [git, store, context] = await startAsync(t);

    const output = await git.runAsync(store, "hash-object", ["--stdin"], "hello", uncancelled);

    assert.equal(output.toString("utf8"), "b6fc4c620b67d95f953a5c1c1230aaab5db5a1b0\n");
    assert.ok(context.requests[1]?.signal instanceof AbortSignal);
    assert.equal(context.requests[1]?.signal?.aborted, false);
  });

  it("lets the caller read a command's output as it comes, within the limit, and gives what the reading gave", async t => {
    const [git, store, context] = await startAsync(t);

    const length = await git.readAsync(store, "hash-object", ["--stdin"], "hello", async output => {
      let total = 0;
      for await (const chunk of output)
        total += Buffer.from(chunk).length;
      return total;
    }, uncancelled);

    assert.equal(length, 41);
    assert.ok(context.requests[1]?.signal instanceof AbortSignal);
  });

  it("keeps one cat-file --batch-command --buffer running for each store between reads, flushing each batch, and gives what each reading gave", async t => {
    const [git, store, context] = await startAsync(t);
    const other = await initAsync(git, path.dirname(path.dirname(store.folder)), "project-2");
    const id = (await git.runAsync(store, "hash-object", ["-w", "--stdin"], "hello", uncancelled)).toString("utf8").trim();
    const start = context.requests.length;

    const first = await git.batchAsync(store, `info ${id}\n`, u => u.readLineAsync(), uncancelled);
    const second = await git.batchAsync(store, `contents ${id}\n`, async u => [await u.readLineAsync(), await u.readLineAsync()], uncancelled);
    const elsewhere = await git.batchAsync(other, `info ${id}\n`, u => u.readLineAsync(), uncancelled);

    assert.equal(first, `${id} blob 5`);
    assert.deepEqual(second, [`${id} blob 5`, "hello"]);
    assert.equal(elsewhere, `${id} missing`);
    assert.deepEqual(context.requests.slice(start).map(u => [u.arguments.join(" "), u.workingFolder]),
      [["cat-file --batch-command --buffer", store.folder], ["cat-file --batch-command --buffer", other.folder]]);
  });

  it("writes each capture to the store's fast-import, kept running, and gives the commit of its mark once the reference is written", async t => {
    const [git, store, context] = await startAsync(t);
    const start = context.requests.length;

    const { written, commit } = await git.importAsync(store, async u => {
      await u.writeAsync(commitOf("refs/probes/1"));
      return "written";
    }, uncancelled);
    const { commit: next } = await git.importAsync(store, u => u.writeAsync(commitOf("refs/probes/2")), uncancelled);

    assert.equal(written, "written");
    assert.equal((await git.runAsync(store, "rev-parse", ["refs/probes/1", "refs/probes/2"], "", uncancelled)).toString("utf8"), `${commit}\n${next}\n`);
    assert.deepEqual(context.requests.slice(start).map(u => u.arguments.join(" ")), ["fast-import --quiet --done", "rev-parse refs/probes/1 refs/probes/2"]);
  });

  it("ends fast-import's input when a writing fails, so it makes no reference, and starts it again for the next capture", async t => {
    const [git, store, context] = await startAsync(t);
    const start = context.requests.length;

    await assert.rejects(git.importAsync(store, async u => {
      await u.writeAsync(commitOf("refs/probes/1"));
      throw new Error("broken writing");
    }, uncancelled), /broken writing/);
    const failed = await context.started.at(-1)?.owned.exited;
    const { commit } = await git.importAsync(store, u => u.writeAsync(commitOf("refs/probes/2")), uncancelled);

    assert.notEqual(failed?.code, 0);
    assert.equal((await git.runAsync(store, "for-each-ref", ["--format=%(refname) %(objectname)"], "", uncancelled)).toString("utf8"), `refs/probes/2 ${commit}\n`);
    assert.deepEqual(context.requests.slice(start, start + 2).map(u => u.arguments[0]), ["fast-import", "fast-import"]);
  });

  it("ends fast-import's input when its meter stops the writing, so it makes no reference and gives no commit", async t => {
    const [git, store, context] = await startAsync(t);
    const start = context.requests.length;

    const { written, commit: stopped } = await git.importAsync(store, async u => {
      u.meterEvery(1, async () => false);
      await u.writeAsync(commitOf("refs/probes/1"));
      return u.isStopped;
    }, uncancelled);
    const { commit } = await git.importAsync(store, u => u.writeAsync(commitOf("refs/probes/2")), uncancelled);

    assert.deepEqual([written, stopped], [true, null]);
    assert.equal((await git.runAsync(store, "for-each-ref", ["--format=%(refname) %(objectname)"], "", uncancelled)).toString("utf8"), `refs/probes/2 ${commit}\n`);
    assert.deepEqual(context.requests.slice(start, start + 2).map(u => u.arguments[0]), ["fast-import", "fast-import"]);
  });

  it("starts a store's fast-import again once it has crashed between captures", async t => {
    const [git, store, context] = await startAsync(t);
    await git.importAsync(store, u => u.writeAsync(commitOf("refs/probes/1")), uncancelled);
    const crashed = context.started.at(-1);
    assert.ok(crashed);
    await crashed.owned.stopAsync();
    await crashed.owned.exited;

    const { commit } = await git.importAsync(store, u => u.writeAsync(commitOf("refs/probes/2")), uncancelled);

    assert.equal((await git.runAsync(store, "rev-parse", ["refs/probes/2"], "", uncancelled)).toString("utf8"), `${commit}\n`);
    assert.equal(context.requests.filter(u => u.arguments[0] === "fast-import").length, 2);
  });

  it("fails a long-lived command that ends before its reading has what it needs, with what it wrote, and starts it again for the next use", async t => {
    const [git, store, context] = await startAsync(t);

    await assert.rejects(git.importAsync(store, u => u.writeAsync("not a command\n"), uncancelled), (error: unknown) =>
      error instanceof GitExitedException && error.command === "fast-import" && error.exitCode !== 0 && error.errors.includes("not a command"));
    const { commit } = await git.importAsync(store, u => u.writeAsync(commitOf("refs/probes/1")), uncancelled);

    assert.match(String(commit), /^[0-9a-f]{40}$/);
    assert.equal(context.requests.filter(u => u.arguments[0] === "fast-import").length, 2);
  });

  it("stops a long-lived command whose signal aborts while it's used, gives the signal's reason once it has exited, and starts it again after", async t => {
    const [git, store, context] = await startAsync(t);
    const cancel = new AbortController();

    await assert.rejects(git.batchAsync(store, "", async u => {
      cancel.abort(new Error("cancelled by its caller"));
      return await u.readLineAsync();
    }, cancel.signal), /cancelled by its caller/);
    const running = context.running.length;
    const answer = await git.batchAsync(store, `info ${"0".repeat(40)}\n`, u => u.readLineAsync(), uncancelled);

    assert.equal(running, 0);
    assert.equal(answer, `${"0".repeat(40)} missing`);
    assert.equal(context.requests.filter(u => u.arguments[0] === "cat-file").length, 2);
  });

  it("gives the reason of a signal aborted before a long-lived command's use, and starts nothing", async t => {
    const [git, store, context] = await startAsync(t);
    const cancel = new AbortController();
    cancel.abort(new Error("cancelled by its caller"));
    const started = context.requests.length;

    await assert.rejects(git.batchAsync(store, `info ${"0".repeat(40)}\n`, u => u.readLineAsync(), cancel.signal), /cancelled by its caller/);

    assert.equal(context.requests.length, started);
  });

  it("fails a long-lived command that can't start, and starts it for the next use", async t => {
    const [, store, , keep] = await startAsync(t);
    const refusing = new RefusingContext(t, path.dirname(path.dirname(store.folder)));
    const git = keep(new GitRunner(refusing, await new GitBuildLocator(import.meta.dirname).locateAsync(process.platform, process.arch), limits, new ManualClock()));

    await assert.rejects(git.batchAsync(store, `info ${"0".repeat(40)}\n`, u => u.readLineAsync(), uncancelled), refusing.refusal);
    const line = await git.batchAsync(store, `info ${"0".repeat(40)}\n`, u => u.readLineAsync(), uncancelled);

    assert.equal(line, `${"0".repeat(40)} missing`);
    assert.equal(refusing.requests.filter(u => u.arguments[0] === "cat-file").length, 1);
  });

  it("fails a command the system refuses to start with the system's error", async t => {
    const [, store] = await startAsync(t);
    const refusing = new RefusingContext(t, path.dirname(path.dirname(store.folder)));
    const git = new GitRunner(refusing, await new GitBuildLocator(import.meta.dirname).locateAsync(process.platform, process.arch), limits, new ManualClock());

    await assert.rejects(git.runAsync(store, "repack", [], "", uncancelled), refusing.refusal);

    assert.deepEqual(refusing.started, []);
  });

  it("fails with the command, its exit code and what it wrote when it doesn't succeed", async t => {
    const [git, store] = await startAsync(t);

    await assert.rejects(git.runAsync(store, "cat-file", ["-t", "0000000000000000000000000000000000000001"], "", uncancelled), (error: unknown) =>
      error instanceof GitExitedException && error.command === "cat-file" && error.exitCode === 128 && error.errors.length > 0);
  });

  it("gives a reading's failure as it is when no cancel came", async t => {
    const [git, store, context] = await startAsync(t);

    await assert.rejects(git.readAsync(store, "hash-object", ["--stdin"], "hello", async () => {
      throw new Error("broken reading");
    }, uncancelled), /broken reading/);

    assert.deepEqual(context.running, []);
  });

  it("never starts a command whose signal aborted before it", async t => {
    const [git, store, context] = await startAsync(t);
    const cancel = new AbortController();
    cancel.abort(new Error("cancelled by its caller"));
    const started = context.started.length;

    await assert.rejects(git.runAsync(store, "hash-object", ["--stdin"], "hello", cancel.signal), /cancelled by its caller/);

    assert.equal(context.started.length, started);
  });

  it("stops a command that runs past its time limit, at the limit and not before, and fails as a stopped command once it has exited", async t => {
    const [, store] = await startAsync(t);
    const held = new ScriptContext(t, path.dirname(path.dirname(store.folder)), "setInterval(() => {}, 1000)");
    const clock = new ManualClock();
    const { promise: running, resolve: ran } = Promise.withResolvers<void>();
    held.watchStart = () => ran();
    const git = new GitRunner(held, await new GitBuildLocator(import.meta.dirname).locateAsync(process.platform, process.arch), limits, clock);

    const stopped = assert.rejects(git.runAsync(store, "repack", [], "", uncancelled), (error: unknown) => error instanceof GitStoppedException && error.command === "repack");
    await running;
    clock.tick(limits.commandMilliseconds - 1);
    await setImmediate();
    const before = held.requests[0]?.signal?.aborted;
    clock.tick(1);
    const at = held.requests[0]?.signal?.aborted;
    await stopped;

    assert.deepEqual([before, at, held.requests.length, held.running], [false, true, 1, []]);
  });

  it("stops a command whose signal aborts, and gives the signal's reason once the command has exited", async t => {
    const [, store] = await startAsync(t);
    const held = new ScriptContext(t, path.dirname(path.dirname(store.folder)), "setInterval(() => {}, 1000)");
    const cancel = new AbortController();
    held.watchStart = () => cancel.abort(new Error("cancelled by its caller"));

    await assert.rejects(new GitRunner(held, await new GitBuildLocator(import.meta.dirname).locateAsync(process.platform, process.arch), limits, new ManualClock())
      .runLongAsync(store, "repack", [], cancel.signal),
      /cancelled by its caller/);

    assert.deepEqual(held.running, []);
  });

  it("gives the signal's reason once the command has exited, when its reading fails after a cancel", async t => {
    const [git, store, context] = await startAsync(t);
    const cancel = new AbortController();

    await assert.rejects(git.readAsync(store, "cat-file", ["--batch"], "", async () => {
      cancel.abort(new Error("cancelled by its caller"));
      throw new Error("broken reading");
    }, cancel.signal), /cancelled by its caller/);

    assert.deepEqual(context.running, []);
  });

  it("gives the output of a command that ended well before its cancel came", async t => {
    const [git, store, context] = await startAsync(t);
    const cancel = new AbortController();

    const output = await git.readAsync(store, "hash-object", ["--stdin"], "hello", async read => {
      const all = await buffer(read);
      await context.started.at(-1)?.owned.exited;
      cancel.abort(new Error("cancelled by its caller"));
      return all;
    }, cancel.signal);

    assert.equal(output.toString("utf8"), "b6fc4c620b67d95f953a5c1c1230aaab5db5a1b0\n");
  });
});

const clockedLimits: GitLimits = new GitLimits(1_000, 2_000, 3_000, 4_000);

const startClockedAsync = async (t: TestContext, clock: ManualClock): Promise<[GitRunner, FolderStore, CheckpointsContext, (other: GitRunner, context: CheckpointsContext) => GitRunner]> => {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "git-runner-")));
  const context = new CheckpointsContext(t, root);
  const git = new GitRunner(context, await new GitBuildLocator(import.meta.dirname).locateAsync(process.platform, process.arch), clockedLimits, clock);
  const runners = [git];
  const contexts = new Set([context]);
  t.after(async () => {
    for (const each of runners)
      await each.stopAllAsync();
    for (const each of contexts)
      await each.disposeAsync();
    await rm(root, { recursive: true, force: true });
  });
  await writeFile(path.join(root, "empty"), "");
  const keep = (other: GitRunner, owner: CheckpointsContext): GitRunner => {
    runners.push(other);
    contexts.add(owner);
    return other;
  };
  return [git, await initAsync(git, root, "project-1"), context, keep];
};

const commandsOf = (context: CheckpointsContext, folder: string): readonly string[] => context.running
  .filter(u => u.request.workingFolder === folder)
  .map(u => u.command).sort();

const inputsEndedOf = (context: CheckpointsContext, folder: string): readonly boolean[] => context.running
  .filter(u => u.request.workingFolder === folder)
  .map(u => u.owned.input.writableEnded);

const endingOf = (context: CheckpointsContext, folder: string): Promise<unknown> => Promise.all(context.running
  .filter(u => u.request.workingFolder === folder)
  .map(u => u.owned.exited));

describe("GitRunner, on a manual clock", { concurrency: true }, () => {
  it("starts Git once with every variable a command gets but GIT_DIR, and stops it at its time limit, not before", async t => {
    const clock = new ManualClock();
    const root = await realpath(await mkdtemp(path.join(tmpdir(), "git-runner-")));
    const build = await new GitBuildLocator(import.meta.dirname).locateAsync(process.platform, process.arch);
    const context = new CheckpointsContext(t, root);
    const held = new ScriptContext(t, root, "setInterval(() => {}, 1000)");
    t.after(async () => {
      await context.disposeAsync();
      await held.disposeAsync();
      await rm(root, { recursive: true, force: true });
    });
    const store = new FolderStore(root, "project-1");

    await new GitRunner(context, build, clockedLimits, clock).startOnceAsync(root, uncancelled);
    const { promise: running, resolve: ran } = Promise.withResolvers<void>();
    held.watchStart = () => ran();
    const stopped = new GitRunner(held, build, clockedLimits, clock).startOnceAsync(root, uncancelled);
    await running;
    clock.tick(clockedLimits.commandMilliseconds - 1);
    await setImmediate();
    const before = held.requests[0]?.signal?.aborted;
    clock.tick(1);

    const environment = context.requests[0]?.environment ?? {};
    assert.deepEqual(Object.keys(environment).sort(), [
      "GIT_ATTR_NOSYSTEM", "GIT_CONFIG_GLOBAL", "GIT_CONFIG_NOSYSTEM", "GIT_EXEC_PATH", "GIT_NO_REPLACE_OBJECTS", "GIT_TERMINAL_PROMPT",
      "HOME", "LC_ALL", "PATH", "XDG_CONFIG_HOME"
    ]);
    assert.deepEqual([environment["GIT_CONFIG_NOSYSTEM"], environment["GIT_CONFIG_GLOBAL"], environment["HOME"], environment["XDG_CONFIG_HOME"]],
      ["1", store.emptyFile, store.moduleFolder, store.moduleFolder]);
    await assert.rejects(stopped, (error: unknown) => error instanceof GitStoppedException && error.command === "--version");
    assert.deepEqual([before, held.requests[0]?.signal?.aborted, held.running], [false, true, []]);
  });

  it("stops a cat-file read that waits past its limit with no output, at the limit and not before, failing as a stopped command", async t => {
    const clock = new ManualClock();
    const [, store, , keep] = await startClockedAsync(t, clock);
    const held = new ScriptContext(t, path.dirname(path.dirname(store.folder)), "process.stdin.resume()");
    const git = keep(new GitRunner(held, await new GitBuildLocator(import.meta.dirname).locateAsync(process.platform, process.arch), clockedLimits, clock), held);
    const { promise: reading, resolve: read } = Promise.withResolvers<void>();

    const stopped = assert.rejects(git.batchAsync(store, "info x\n", async u => {
      read();
      return await u.readLineAsync();
    }, uncancelled), (error: unknown) => error instanceof GitStoppedException && error.command === "cat-file");
    await reading;
    clock.tick(clockedLimits.batchIdleMilliseconds - 1);
    await setImmediate();
    const before = held.stopped;
    clock.tick(1);
    const at = held.stopped;
    await stopped;

    assert.deepEqual([before, at, held.running.length], [0, 1, 0]);
  });

  it("keeps a cat-file read running past its limit while its output keeps coming, counting the limit again from each part", async t => {
    const clock = new ManualClock();
    const [, store, , keep] = await startClockedAsync(t, clock);
    const echo = new ScriptContext(t, path.dirname(path.dirname(store.folder)), "process.stdin.pipe(process.stdout)");
    const git = keep(new GitRunner(echo, await new GitBuildLocator(import.meta.dirname).locateAsync(process.platform, process.arch), clockedLimits, clock), echo);

    const lines = await git.batchAsync(store, "", async u => {
      const read = [await u.readLineAsync()];
      for (const each of ["first", "second", "third"]) {
        clock.tick(clockedLimits.batchIdleMilliseconds - 1);
        await u.input.writeAsync(`${each}\n`);
        read.push(await u.readLineAsync());
      }
      return read;
    }, uncancelled);

    assert.deepEqual([lines, echo.requests.length, echo.running.length, echo.stopped], [["flush", "first", "second", "third"], 1, 1, 0]);
  });

  it("ends a store's long-lived commands once the idle delay passes with none in use, or when stopped, fast-import at its done", async t => {
    const clock = new ManualClock();
    const [git, store, context, keep] = await startClockedAsync(t, clock);
    const other = await initAsync(git, path.dirname(path.dirname(store.folder)), "project-2");

    await git.batchAsync(store, `info ${"0".repeat(40)}\n`, u => u.readLineAsync(), uncancelled);
    clock.tick(clockedLimits.idleStopMilliseconds - 1);
    await setImmediate();
    const beforeIdle = inputsEndedOf(context, store.folder);
    const ended = endingOf(context, store.folder);
    clock.tick(1);
    const atIdle = inputsEndedOf(context, store.folder);
    await ended;
    assert.deepEqual([beforeIdle, atIdle, commandsOf(context, store.folder)], [[false], [true], []]);
    const kept = keep(new GitRunner(context, await new GitBuildLocator(import.meta.dirname).locateAsync(process.platform, process.arch), clockedLimits, clock), context);
    for (const each of [store, other]) {
      await kept.batchAsync(each, `info ${"0".repeat(40)}\n`, u => u.readLineAsync(), uncancelled);
      await kept.importAsync(each, u => u.writeAsync(commitOf("refs/probes/1")), uncancelled);
    }
    const imports = context.started.filter(u => u.command === "fast-import");
    await kept.stopStoreAsync(store);
    const afterStore = [commandsOf(context, store.folder), commandsOf(context, other.folder)];
    await kept.stopAllAsync();

    assert.deepEqual(afterStore, [[], ["cat-file", "fast-import"]]);
    assert.deepEqual([commandsOf(context, store.folder), commandsOf(context, other.folder)], [[], []]);
    assert.deepEqual(await Promise.all(imports.map(async u => (await u.owned.exited).code)), [0, 0]);
  });

  it("fails as a stopped command when its time limit passes before Git has started", async t => {
    const clock = new ManualClock();
    const [, store, , keep] = await startClockedAsync(t, clock);
    const late = new LateContext(t, path.dirname(path.dirname(store.folder)));
    late.beforeStart = () => clock.tick(clockedLimits.commandMilliseconds);
    const git = keep(new GitRunner(late, await new GitBuildLocator(import.meta.dirname).locateAsync(process.platform, process.arch), clockedLimits, clock), late);

    await assert.rejects(git.runAsync(store, "repack", [], "", uncancelled), (error: unknown) => error instanceof GitStoppedException && error.command === "repack");

    assert.deepEqual(late.started, []);
  });

  it("fails as a stopped command when its reading fails once its time limit has stopped it", async t => {
    const clock = new ManualClock();
    const [git, store, context] = await startClockedAsync(t, clock);
    const failure = new Error("The reading failed.");

    await assert.rejects(git.readAsync(store, "cat-file", ["--batch"], "", async () => {
      clock.tick(clockedLimits.commandMilliseconds);
      throw failure;
    }, uncancelled), (error: unknown) => error instanceof GitStoppedException && error.command === "cat-file");

    assert.deepEqual(context.running, []);
  });

  it("waits for an idle stop that has begun when all its commands are stopped", async t => {
    const clock = new ManualClock();
    const [git, store, context] = await startClockedAsync(t, clock);
    await git.batchAsync(store, `info ${"0".repeat(40)}\n`, u => u.readLineAsync(), uncancelled);
    clock.tick(clockedLimits.idleStopMilliseconds - 1);
    await setImmediate();
    const before = inputsEndedOf(context, store.folder);

    clock.tick(1);
    const at = inputsEndedOf(context, store.folder);
    await git.stopAllAsync();

    assert.deepEqual([before, at, context.started.filter(u => u.command === "cat-file").map(u => u.owned.hasExited)], [[false], [true], [true]]);
  });

  it("keeps a store's commands running past the idle delay while any use of them runs, and ends them once the last use ends", async t => {
    const clock = new ManualClock();
    const [git, store, context] = await startClockedAsync(t, clock);
    const { promise: held, resolve: release } = Promise.withResolvers<void>();
    const { promise: writing, resolve: entered } = Promise.withResolvers<void>();

    const importing = git.importAsync(store, async u => {
      entered();
      await held;
      await u.writeAsync(commitOf("refs/probes/1"));
    }, uncancelled);
    await writing;
    await git.batchAsync(store, `info ${"0".repeat(40)}\n`, u => u.readLineAsync(), uncancelled);
    clock.tick(clockedLimits.idleStopMilliseconds);
    const during = commandsOf(context, store.folder);
    await git.batchAsync(store, `info ${"0".repeat(40)}\n`, u => u.readLineAsync(), uncancelled);
    release();
    await importing;
    const ended = endingOf(context, store.folder);
    clock.tick(clockedLimits.idleStopMilliseconds);
    await ended;

    assert.deepEqual(during, ["cat-file", "fast-import"]);
    assert.deepEqual(context.requests.filter(u => u.arguments[0] === "cat-file" || u.arguments[0] === "fast-import").map(u => String(u.arguments[0])),
      ["fast-import", "cat-file"]);
    assert.deepEqual(commandsOf(context, store.folder), []);
  });
});

describe("GitRunner's idle stop", { concurrency: true }, () => {
  it("logs a failure of an idle stop, and still ends the store's commands", async t => {
    const clock = new ManualClock();
    const [git, store, context] = await startClockedAsync(t, clock);
    await git.batchAsync(store, `info ${"0".repeat(40)}\n`, u => u.readLineAsync(), uncancelled);
    const input = context.running.find(u => u.command === "cat-file")?.owned.input;
    assert.ok(!Object.isUndefined(input));
    const failed = new Promise(resolve => input.once("error", resolve));
    input.destroy(new Error("The input failed."));
    await failed;

    clock.tick(clockedLimits.idleStopMilliseconds);
    await git.stopAllAsync();

    assert.deepEqual([CheckpointsContext.messagesOf(context.log).filter(u => u.startsWith("Stopping the idle Git")), commandsOf(context, store.folder)],
      [[`Stopping the idle Git of the store ${store.folder} failed: The input failed.`], []]);
  });
});
