/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, readlink, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buffer } from "node:stream/consumers";
import { setTimeout } from "node:timers/promises";

import {
  CaptureRequest,
  CompareRequest,
  DiffTarget,
  FolderReference,
  ListRequest,
  PreviewRequest,
  ReadRequest,
  RestoreRequest,
  type CaptureResult,
  type Checkpoint,
  type CompareResult,
  type PreviewResult,
  type ReadResult,
  type RestorePlan,
  type RestoreResult
} from "@noldova/checkpoints.protocol";
import { EventChannel, ProcessRequest } from "@noldova/desktop.runtime";

import type { GitBuild } from "../../src/models/git-build.ts";
import { GitLimits } from "../../src/models/git-limits.ts";
import { CheckpointsHost } from "../../src/services/checkpoints-host.ts";
import { GitBuildLocator } from "../../src/services/git-build.locator.ts";
import { GitRunner } from "../../src/services/git-runner.ts";
import { ModuleActivation } from "../../src/services/module-activation.ts";
import { CheckpointsContext } from "./checkpoints-context.fixture.ts";
import { DesktopProcesses } from "./desktop-processes.fixture.ts";
import { FailureFixture } from "./failure.fixture.ts";
import { GitRun } from "./git-run.fixture.ts";
import type { ICleanups } from "./i-cleanups.fixture.ts";
import { JsonFixture, type JsonFields } from "./json.fixture.ts";
import { ManualClock } from "./manual-clock.fixture.ts";
import type { ServiceSeams } from "./service-seams.fixture.ts";
import { TreeEntry } from "./tree-entry.fixture.ts";

export class CheckpointsHarness {
  public static readonly identity: string = "project-1";
  public static readonly unknownId: string = "01890a5d-ac96-774b-bcce-b302099a8057";

  private static readonly appearInterval: number = 10;
  private static readonly appearLimit: number = 60_000;

  private readonly build: GitBuild;
  private host: CheckpointsHost;
  private readonly hosts: CheckpointsHost[];
  private readonly processes: DesktopProcesses;
  private readonly stops: (() => Promise<void>)[];

  public readonly clock: ManualClock;
  public readonly context: CheckpointsContext;
  public readonly folder: string;
  public readonly root: string;

  private constructor(root: string, context: CheckpointsContext, clock: ManualClock, hosts: CheckpointsHost[], host: CheckpointsHost, build: GitBuild,
    processes: DesktopProcesses, stops: (() => Promise<void>)[]) {
    this.build = build;
    this.clock = clock;
    this.host = host;
    this.hosts = hosts;
    this.context = context;
    this.processes = processes;
    this.stops = stops;
    this.folder = path.join(root, "project");
    this.root = root;
  }

  public get service(): CheckpointsHost {
    return this.host;
  }

  public get reference(): FolderReference {
    return new FolderReference(CheckpointsHarness.identity, this.folder);
  }

  public get store(): string {
    return path.join(this.context.moduleFolder, "folders", CheckpointsHarness.identity);
  }

  public static async appearedAsync(location: string): Promise<void> {
    const limit = performance.now() + CheckpointsHarness.appearLimit;
    while (!existsSync(location)) {
      if (performance.now() > limit)
        throw new Error(`${location} didn't appear within ${CheckpointsHarness.appearLimit} ms.`);
      await setTimeout(CheckpointsHarness.appearInterval);
    }
  }

  public static async startAsync(t: ICleanups): Promise<CheckpointsHarness> {
    const root = await realpath(await mkdtemp(path.join(tmpdir(), "checkpoints-")));
    const clock = new ManualClock(Date.now());
    const hosts: CheckpointsHost[] = [];
    const stops: (() => Promise<void>)[] = [];
    const context = new CheckpointsContext(t, path.join(root, "module"));
    const processes = await DesktopProcesses.createAsync();
    t.after(async () => {
      for (const host of hosts)
        await host.stopAsync();
      for (const stop of stops)
        await stop();
      await processes.disposeAsync();
      await rm(root, { recursive: true, force: true });
    });
    await mkdir(path.join(root, "project"));
    await writeFile(path.join(root, "git-config"), "");
    const { promise: gitStarted, resolve: logged } = Promise.withResolvers<void>();
    context.log.answer("write", () => logged());
    const host = await ModuleActivation.activateAsync(context, clock);
    hosts.push(host);
    await gitStarted;
    context.requests.splice(0);
    context.started.splice(0);
    return new CheckpointsHarness(root, context, clock, hosts, host, await new GitBuildLocator(import.meta.dirname).locateAsync(process.platform, process.arch), processes, stops);
  }

  public static vouchingStartOf(index: JsonFields): string {
    const times = JsonFixture.objectsOf(index["entries"]).flatMap(t => [BigInt(JsonFixture.textOf(t["modified"])), BigInt(JsonFixture.textOf(t["changed"]))]);
    return String(times.reduce((newest, t) => t > newest ? t : newest, 0n) + 2_000_000_000n + 1n);
  }

  public async activateAsync(): Promise<void> {
    this.clock.tick(1);
    this.host = await ModuleActivation.activateAsync(this.context, this.clock);
    this.hosts.push(this.host);
  }

  public async deactivateAsync(): Promise<void> {
    await this.host.stopAsync();
  }

  public async captureAsync(label: string | null): Promise<CaptureResult> {
    return await this.service.captureAsync(new CaptureRequest(new FolderReference(CheckpointsHarness.identity, this.folder), label));
  }

  public async createServiceAsync(seams: ServiceSeams): Promise<CheckpointsHost> {
    const nowhere = (): EventChannel => new EventChannel(() => undefined, () => undefined);
    const build = await new GitBuildLocator(import.meta.dirname).locateAsync(process.platform, process.arch);
    this.clock.tick(1);
    const service = new CheckpointsHost(this.context, build, process.platform, nowhere(), nowhere(), nowhere(), nowhere(), seams.journals, seams.hasRoom,
      seams.hardLink, seams.readFree, seams.renameFolder, seams.removeFolder, seams.statFile, this.clock);
    this.stops.push(async () => await service.stopAsync());
    return service;
  }

  public async createGitRunnerAsync(): Promise<GitRunner> {
    const git = new GitRunner(this.context, await new GitBuildLocator(import.meta.dirname).locateAsync(process.platform, process.arch), new GitLimits(60_000, 60_000, 600_000, 10_000), this.clock);
    this.stops.push(async () => await git.stopAllAsync());
    return git;
  }

  public async checkpointAsync(label: string | null): Promise<Checkpoint> {
    const result = await this.captureAsync(label);
    if (result.checkpoint === null)
      throw new Error(`The capture gave ${result.outcome.value}.`);
    return result.checkpoint;
  }

  public commandsSince(start: number): readonly string[] {
    return this.context.requests.slice(start).map(t => String(t.arguments[0]));
  }

  public watchCatFile(): readonly string[] {
    const lines: string[] = [];
    this.context.watchInput = (command, chunk) => {
      if (command === "cat-file")
        lines.push(...chunk.split("\n").filter(t => t !== ""));
    };
    return lines;
  }

  public async compareAsync(from: Checkpoint | string, to: Checkpoint | string | null): Promise<CompareResult> {
    const idOf = (checkpoint: Checkpoint | string): string => typeof checkpoint === "string" ? checkpoint : checkpoint.id;
    return await this.service.compareAsync(new CompareRequest(this.reference, idOf(from), to === null ? null : idOf(to)));
  }

  public async contentAsync(checkpoint: Checkpoint, treePath: string): Promise<Buffer> {
    return await this.gitAsync(["cat-file", "blob", `refs/checkpoints/${checkpoint.id}:${treePath}`]);
  }

  public async gitAsync(args: readonly string[], input: string | Uint8Array = ""): Promise<Buffer> {
    const run = await this.runGitAsync(args, input);
    if (run.code !== 0)
      throw new Error(`git ${args.join(" ")} failed: ${run.errors.toString("utf8")}`);
    return run.output;
  }

  public async exitCodeAsync(args: readonly string[]): Promise<number | null> {
    return (await this.runGitAsync(args, "")).code;
  }

  public async listAsync(): Promise<readonly Checkpoint[]> {
    return (await this.service.listAsync(new ListRequest(new FolderReference(CheckpointsHarness.identity, this.folder)))).checkpoints;
  }

  public async objectCountAsync(): Promise<number> {
    const output = await this.gitAsync(["cat-file", "--batch-all-objects", "--batch-check"]);
    return output.toString("utf8").split("\n").filter(t => t !== "").length;
  }

  public async previewAsync(checkpoint: Checkpoint | string, paths?: readonly string[]): Promise<PreviewResult> {
    return await this.service.previewRestoreAsync(new PreviewRequest(this.reference, typeof checkpoint === "string" ? checkpoint : checkpoint.id, paths ?? null));
  }

  public async readAsync(checkpoint: Checkpoint | string, relativePath: string, against: Checkpoint | string | null, limit: number = 1024 * 1024): Promise<ReadResult> {
    const idOf = (value: Checkpoint | string): string => typeof value === "string" ? value : value.id;
    const target = against === null ? null : new DiffTarget(against === "now" ? null : idOf(against));
    return await this.service.readAsync(new ReadRequest(this.reference, idOf(checkpoint), relativePath, target, limit));
  }

  public async planAsync(checkpoint: Checkpoint | string, paths?: readonly string[]): Promise<RestorePlan> {
    const result = await this.previewAsync(checkpoint, paths);
    if (result.plan === null)
      throw new Error(`The preview gave ${result.outcome.value}.`);
    return result.plan;
  }

  public async restoreAsync(plan: RestorePlan, service: CheckpointsHost = this.service): Promise<RestoreResult> {
    return await service.restoreAsync(new RestoreRequest(this.reference, plan));
  }

  public async snapshotAsync(location: string = this.folder): Promise<readonly (readonly [string, string | null])[]> {
    const entries = await readdir(location, { recursive: true, withFileTypes: true });
    const named = await Promise.all(entries.map(async t => {
      const full = path.join(t.parentPath, t.name);
      const relative = path.relative(location, full).split(path.sep).join("/");
      if (t.isSymbolicLink())
        return [relative, `link:${await readlink(full)}`] as const;
      return [relative, t.isDirectory() ? null : (await readFile(full)).toString("base64")] as const;
    }));
    return named.sort(([t], [u]) => Buffer.compare(Buffer.from(t), Buffer.from(u)));
  }

  public async readStoreFileAsync(name: string): Promise<JsonFields> {
    return JsonFixture.parse(await readFile(path.join(this.store, name), "utf8"));
  }

  public async treeAsync(checkpoint: Checkpoint): Promise<ReadonlyMap<string, TreeEntry>> {
    const output = await this.gitAsync(["ls-tree", "-r", "-z", `refs/checkpoints/${checkpoint.id}`]);
    return new Map(output.toString("utf8").split("\0").filter(t => t !== "").map(t => {
      const [meta = "", name = ""] = t.split("\t");
      const [mode = "", , objectId = ""] = meta.split(" ");
      return [name, new TreeEntry(mode, objectId)];
    }));
  }

  public async writeAsync(relativePath: string, content: string | Uint8Array): Promise<string> {
    const location = path.join(this.folder, ...relativePath.split("/"));
    await mkdir(path.dirname(location), { recursive: true });
    await writeFile(location, content);
    return location;
  }

  private async runGitAsync(args: readonly string[], input: string | Uint8Array): Promise<GitRun> {
    const environment = {
      GIT_DIR: path.join(this.store, "git"),
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: path.join(this.root, "git-config"),
      HOME: this.root,
      XDG_CONFIG_HOME: this.root,
      GIT_EXEC_PATH: this.build.execPath,
      PATH: this.build.path.join(path.delimiter),
      GIT_TERMINAL_PROMPT: "0",
      GIT_ATTR_NOSYSTEM: "1",
      GIT_NO_REPLACE_OBJECTS: "1",
      LC_ALL: "C"
    };
    const git = await this.processes.startAsync(new ProcessRequest(this.build.program, args, this.root, environment));
    const refused: Error[] = [];
    git.input.on("error", (error: Error) => {
      if (!FailureFixture.hasCode(error, "EPIPE") && !FailureFixture.hasCode(error, "ENOTCONN"))
        refused.push(error);
    });
    git.input.end(input);
    const [output, errors, exit] = await Promise.all([buffer(git.output), buffer(git.errors), git.exited]);
    if (refused.length > 0)
      throw new AggregateError(refused, `git ${args.join(" ")} refused its input.`);
    return new GitRun(exit.code, output, errors);
  }
}
