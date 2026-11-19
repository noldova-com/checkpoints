/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { ChildProcess, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import { describe, it } from "node:test";
import { setImmediate } from "node:timers/promises";

import { OwnedProcess, ProcessExit, ProcessRequest } from "@noldova/desktop.runtime";

import { GitExitedException, GitStoppedException } from "../../src/api/index.ts";
import { GitProcess } from "../../src/services/git-process.ts";
import { CheckpointsContext } from "../fixtures/checkpoints-context.fixture.ts";
import { ManualClock } from "../fixtures/manual-clock.fixture.ts";

class StreamChild extends ChildProcess implements ChildProcessWithoutNullStreams {
  public override stdin: PassThrough = new PassThrough();
  public override stdout: PassThrough = new PassThrough();
  public override stderr: PassThrough = new PassThrough();
  public override readonly stdio: ChildProcessWithoutNullStreams["stdio"] = [this.stdin, this.stdout, this.stderr, undefined, undefined];
}

describe("GitProcess", { concurrency: true }, () => {
  it("gives the failure of a command a signal stopped, and of one that exited with its code", () => {
    assert.deepEqual(GitProcess.failureOf("cat-file", null, "killed"), new GitStoppedException("cat-file", "killed"));
    assert.deepEqual(GitProcess.failureOf("fast-import", 128, "fatal"), new GitExitedException("fast-import", 128, "fatal"));
  });

  it("gives a command its limit stopped as stopped, with what it wrote, whatever code the system gave it on its exit", async () => {
    const child = new StreamChild();
    const running = new GitProcess("cat-file", new OwnedProcess(child, "git", new Date(), Promise.resolve(new ProcessExit(1, null)), async () => undefined), new ManualClock());
    const ended = once(child.stderr, "end");
    child.stderr.end("fatal: stopped");
    await ended;

    assert.deepEqual(await running.stoppedAsync(), new GitStoppedException("cat-file", "fatal: stopped"));
  });

  it("gives a failed command's failure with all it wrote, though its exit came before the end of what it wrote", async () => {
    const child = new StreamChild();
    const running = new GitProcess("fast-import", new OwnedProcess(child, "git", new Date(), Promise.resolve(new ProcessExit(128, null)), async () => undefined), new ManualClock());
    const failure = running.failureAsync();
    await setImmediate();
    child.stderr.end("fatal: not a command");

    assert.deepEqual(await failure, new GitExitedException("fast-import", 128, "fatal: not a command"));
  });

  it("gives a failed command's failure with what it wrote, naming its error output still open, 5 seconds after its exit and not a millisecond before", async () => {
    const child = new StreamChild();
    const clock = new ManualClock();
    const running = new GitProcess("fast-import", new OwnedProcess(child, "git", new Date(), Promise.resolve(new ProcessExit(128, null)), async () => undefined), clock);
    child.stderr.write("fatal: not a command");
    let failure: unknown = null;
    const failing = running.failureAsync().then(t => {
      failure = t;
    });
    await clock.scheduledAsync("fast-import's wait for its error output to close");

    clock.tick(4_999);
    await setImmediate();
    const before = failure;
    clock.tick(1);
    await failing;

    assert.deepEqual([before, failure], [null, new GitExitedException("fast-import", 128,
      "fatal: not a command\nGit's fast-import kept its error output open 5000 ms after it ended, so this is what it wrote by then.")]);
  });

  it("gives a stopped command's failure naming its error output still open, 5 seconds after its exit and not a millisecond before", async () => {
    const child = new StreamChild();
    const clock = new ManualClock();
    const running = new GitProcess("cat-file", new OwnedProcess(child, "git", new Date(), Promise.resolve(new ProcessExit(null, "SIGTERM")), async () => undefined), clock);
    let failure: unknown = null;
    const failing = running.stoppedAsync().then(t => {
      failure = t;
    });
    await clock.scheduledAsync("cat-file's wait for its error output to close");

    clock.tick(4_999);
    await setImmediate();
    const before = failure;
    clock.tick(1);
    await failing;

    assert.deepEqual([before, failure], [null, new GitStoppedException("cat-file", "Git's cat-file kept its error output open 5000 ms after it ended, so this is what it wrote by then.")]);
  });

  it("stops a command still running once the limit after the end of its input has passed, and not a millisecond before", async t => {
    const root = await realpath(await mkdtemp(path.join(tmpdir(), "git-process-")));
    t.after(() => rm(root, { recursive: true, force: true }));
    const context = new CheckpointsContext(t, root);
    const program = await context.startProcessAsync(new ProcessRequest(process.execPath, ["-e", "setInterval(() => {}, 1000)"], root, {}));
    const stops = t.mock.method(program, "stopAsync");
    const clock = new ManualClock();
    const running = new GitProcess("cat-file", program, clock);

    const ending = running.endAsync("", 50);
    clock.tick(49);
    await setImmediate();
    const before = stops.mock.callCount();
    clock.tick(1);
    await ending;

    assert.deepEqual([before, stops.mock.callCount(), running.hasExited, context.running.length], [0, 1, true, 0]);
  });

  it("reads a line that comes in parts, and keeps what follows it for the next reading", async () => {
    const child = new StreamChild();
    const running = new GitProcess("cat-file", new OwnedProcess(child, "git", new Date(), new Promise<ProcessExit>(() => undefined), async () => undefined), new ManualClock());

    child.stdout.write("ab");
    const line = running.readLineAsync();
    child.stdout.write("c\nde\n");

    assert.deepEqual([await line, await running.readLineAsync()], ["abc", "de"]);
  });
});

describe("GitProcess's end", { concurrency: true }, () => {
  it("stops the command at once, and rejects with the failure, when its last input can't be written", async () => {
    const child = new StreamChild();
    const failure = new Error("The input failed.");
    const { promise: exited, resolve: exit } = Promise.withResolvers<ProcessExit>();
    let stops = 0;
    const running = new GitProcess("fast-import", new OwnedProcess(child, "git", new Date(), exited, async () => {
      stops++;
      exit(new ProcessExit(null, "SIGKILL"));
    }), new ManualClock());
    const failed = once(child.stdin, "error");
    child.stdin.destroy(failure);
    await failed;

    await assert.rejects(running.endAsync("done\n", 50), failure);

    assert.equal(stops, 1);
  });

  it("rejects with a failure of its input after its last write, once the command has exited", async () => {
    const child = new StreamChild();
    const failure = new Error("The input failed.");
    const { promise: exited, resolve: exit } = Promise.withResolvers<ProcessExit>();
    let stops = 0;
    const running = new GitProcess("fast-import", new OwnedProcess(child, "git", new Date(), exited, async () => {
      stops++;
    }), new ManualClock());

    const ending = running.endAsync("done\n", 50);
    await setImmediate();
    const failed = once(child.stdin, "error");
    child.stdin.destroy(failure);
    await failed;
    exit(new ProcessExit(0, null));

    await assert.rejects(ending, failure);
    assert.equal(stops, 0);
  });
});
