/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import "@noldova/context.core";
import {
  CaptureResult,
  CheckpointList,
  CompareResult,
  DeleteFolderResult,
  InvalidCheckpointIdException,
  InvalidIdentityException,
  InvalidRelativePathException,
  ListRequest,
  PreviewResult,
  ReadResult,
  RestoreResult,
  StorageList
} from "@noldova/checkpoints.protocol";
import { JsonException, type JsonValue } from "@noldova/context.json";
import { FailureCode } from "@noldova/desktop.protocol";
import { MethodFailureException, type OwnedProcess, type ProcessRequest } from "@noldova/desktop.runtime";

import { CheckpointsService } from "../../src/api/index.ts";
import { CheckpointsHost } from "../../src/services/checkpoints-host.ts";
import { GitBuildLocator } from "../../src/services/git-build.locator.ts";
import { ModuleActivation } from "../../src/services/module-activation.ts";
import { CheckpointsContext } from "../fixtures/checkpoints-context.fixture.ts";
import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";
import { JsonFixture } from "../fixtures/json.fixture.ts";
import { ManualClock } from "../fixtures/manual-clock.fixture.ts";

class UnstartedContext extends CheckpointsContext {
  private readonly failure: Error | null;
  private readonly stopFailure: Error | null;

  public constructor(t: TestContext, moduleFolder: string, failure: Error | null, stopFailure: Error | null) {
    super(t, moduleFolder);
    this.failure = failure;
    this.stopFailure = stopFailure;
  }

  protected override async startAsync(request: ProcessRequest): Promise<OwnedProcess> {
    this.requests.push(request);
    if (!Object.isNull(this.failure))
      throw this.failure;
    const { promise, reject } = Promise.withResolvers<OwnedProcess>();
    request.signal?.addEventListener("abort", () => reject(this.stopFailure ?? request.signal?.reason), { once: true });
    return await promise;
  }
}

function nextLogged(context: CheckpointsContext): Promise<string> {
  const { promise, resolve } = Promise.withResolvers<string>();
  context.log.answer("write", resolve);
  return promise;
}

async function moduleFolderAsync(t: TestContext, prefix: string): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), prefix));
  t.after(() => rm(root, { recursive: true, force: true }));
  return path.join(root, "module");
}

describe("ModuleActivation", { concurrency: true }, () => {
  it("publishes a service on the clock it is given, with each method and event the module declares", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    harness.clock.tick(5_000);

    const checkpoint = await harness.checkpointAsync(null);

    assert.ok(harness.context.services.get("checkpoints.service") instanceof CheckpointsHost);
    assert.deepEqual([...harness.context.methods.keys()].sort(), [
      "checkpoints.capture", "checkpoints.compare", "checkpoints.deleteFolder", "checkpoints.list", "checkpoints.previewRestore", "checkpoints.read", "checkpoints.restore",
      "checkpoints.storage"
    ]);
    assert.deepEqual([...harness.context.events.keys()].sort(), ["checkpoints.capturePaused", "checkpoints.captureResumed", "checkpoints.restoreHeldUp", "checkpoints.restored"]);
    assert.equal(checkpoint.time.getTime(), harness.clock.now());
  });

  it("stops the service it publishes once asked, after the capture it ran, leaving no Git running and refusing a later request", async t => {
    const moduleFolder = await moduleFolderAsync(t, "checkpoints-deactivated-");
    const project = path.join(path.dirname(moduleFolder), "project");
    await mkdir(project);
    const context = new CheckpointsContext(t, moduleFolder);
    const folder = { identity: "project-1", path: project };
    const host = await ModuleActivation.activateAsync(context, new ManualClock());
    const captured = CaptureResult.fromJson(await context.callAsync("checkpoints.capture", { folder, label: null, asOf: null }));

    await host.stopAsync();

    assert.deepEqual([captured.outcome.value, context.running.length], ["Captured", 0]);
    await assert.rejects(context.callAsync("checkpoints.list", { folder }), (error: unknown) => error instanceof DOMException && error.name === "AbortError");
  });

  it("starts the build's Git once with --version in the background as it activates, and logs how long it took", async t => {
    const context = new CheckpointsContext(t, await moduleFolderAsync(t, "checkpoints-started-"));
    const clock = new ManualClock();
    context.watchStart = () => clock.tick(250);
    const logged = nextLogged(context);
    const build = await new GitBuildLocator(import.meta.dirname).locateAsync(process.platform, process.arch);

    const host = await ModuleActivation.activateAsync(context, clock);
    const message = await logged;
    await host.stopAsync();

    assert.deepEqual(context.requests.map(u => [u.program, u.arguments.join(" "), u.workingFolder]), [[build.program, "--version", build.execPath]]);
    assert.equal(message, "Git started once as the module started, in 250 ms.");
    assert.equal(context.running.length, 0);
  });

  it("activates without failing when Git's first start fails, and logs the failure", async t => {
    const context = new UnstartedContext(t, await moduleFolderAsync(t, "checkpoints-unstarted-"), new Error("The program can't start."), null);
    const logged = nextLogged(context);

    const host = await ModuleActivation.activateAsync(context, new ManualClock());
    const message = await logged;
    await host.stopAsync();

    assert.equal(context.requests.length, 1);
    assert.equal(message, "Starting Git once as the module started failed, so the first command it runs starts it: The program can't start.");
    assert.ok(context.services.get("checkpoints.service") instanceof CheckpointsService);
  });

  it("activates while Git's first start hangs, and its stop ends that start without logging it", async t => {
    const context = new UnstartedContext(t, await moduleFolderAsync(t, "checkpoints-held-"), null, null);

    const host = await ModuleActivation.activateAsync(context, new ManualClock());
    const started = [context.requests.length, context.services.has("checkpoints.service"), context.requests[0]?.signal?.aborted];
    await host.stopAsync();

    assert.deepEqual(started, [1, true, false]);
    assert.equal(context.requests[0]?.signal?.aborted, true);
    assert.deepEqual(CheckpointsContext.messagesOf(context.log), []);
  });

  it("logs a failure of Git's first start that isn't its stop's, though the stop came first", async t => {
    const context = new UnstartedContext(t, await moduleFolderAsync(t, "checkpoints-broken-"), null, new Error("The program broke as it stopped."));

    const host = await ModuleActivation.activateAsync(context, new ManualClock());
    await host.stopAsync();

    assert.equal(context.requests[0]?.signal?.aborted, true);
    assert.deepEqual(CheckpointsContext.messagesOf(context.log), ["Starting Git once as the module started failed, so the first command it runs starts it: The program broke as it stopped."]);
  });

  it("publishes the checkpoints service, registers each method and declares each event the module declares", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const declared = JsonFixture.objectOf(JsonFixture.parse(await readFile(new URL("../../module.json", import.meta.url), "utf8"))["contributes"]);

    assert.ok(harness.context.services.get("checkpoints.service") instanceof CheckpointsService);
    assert.deepEqual([...harness.context.methods.keys()].sort(), JsonFixture.listOf(declared["methods"]).map(t => JsonFixture.textOf(t)).sort());
    assert.deepEqual([...harness.context.events.keys()].sort(), JsonFixture.listOf(declared["events"]).map(t => JsonFixture.textOf(t)).sort());
  });

  it("answers checkpoints.capture and checkpoints.list in their wire forms", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const folder = { identity: CheckpointsHarness.identity, path: harness.folder };
    await harness.writeAsync("a.txt", "alpha");

    const captured = CaptureResult.fromJson(await harness.context.callAsync("checkpoints.capture", { folder, label: "Turn 1", asOf: "2100-01-01T00:00:00.000Z" }));
    const listed = CheckpointList.fromJson(await harness.context.callAsync("checkpoints.list", { folder }));

    assert.equal(captured.checkpoint?.label, "Turn 1");
    assert.deepEqual(listed.checkpoints.map(u => u.id), [captured.checkpoint?.id]);
  });

  it("answers checkpoints.compare and checkpoints.read in their wire forms", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const folder = { identity: CheckpointsHarness.identity, path: harness.folder };
    await harness.writeAsync("a.txt", "a\n");
    const first = await harness.checkpointAsync(null);
    await harness.writeAsync("a.txt", "b\n");
    const second = await harness.checkpointAsync(null);

    const compared = CompareResult.fromJson(await harness.context.callAsync("checkpoints.compare", { folder, from: first.id, to: second.id }));
    const content = ReadResult.fromJson(await harness.context.callAsync("checkpoints.read", { folder, checkpoint: first.id, path: "a.txt", against: null, limit: 1 }));
    const diff = ReadResult.fromJson(await harness.context.callAsync("checkpoints.read", {
      folder, checkpoint: first.id, path: "a.txt", against: { checkpoint: null }, limit: 1024
    }));

    assert.deepEqual(compared.changes.map(u => [u.path, u.status.value]), [["a.txt", "Modified"]]);
    assert.deepEqual([Buffer.from(content.content).toString(), content.size, content.isCut], ["a", 2, true]);
    assert.equal(Buffer.from(diff.content).toString(), "@@ -1 +1 @@\n-a\n+b\n");
  });

  it("answers checkpoints.previewRestore in its wire form", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const folder = { identity: CheckpointsHarness.identity, path: harness.folder };
    await harness.writeAsync("a.txt", "a");
    const first = await harness.checkpointAsync(null);
    await harness.writeAsync("a.txt", "b 2");

    const previewed = PreviewResult.fromJson(await harness.context.callAsync("checkpoints.previewRestore", { folder, checkpoint: first.id, paths: null }));

    assert.deepEqual([previewed.outcome.value, previewed.plan?.steps.map(u => [u.path, u.action.value]), previewed.plan?.bytesToWrite], ["Planned", [["a.txt", "Replace"]], 1]);
  });

  it("answers checkpoints.restore in its wire form, and raises checkpoints.restored", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const folder = { identity: CheckpointsHarness.identity, path: harness.folder };
    await harness.writeAsync("a.txt", "a");
    const first = await harness.checkpointAsync(null);
    await harness.writeAsync("a.txt", "b 2");
    const plan = JsonFixture.fieldOf(await harness.context.callAsync("checkpoints.previewRestore", { folder, checkpoint: first.id, paths: null }), "plan");

    const restored = RestoreResult.fromJson(await harness.context.callAsync("checkpoints.restore", { folder, plan }));

    assert.deepEqual([restored.outcome.value, restored.before?.label], ["Restored", "Before restore"]);
    assert.equal(await readFile(path.join(harness.folder, "a.txt"), "utf8"), "a");
    assert.equal(harness.context.events.get("checkpoints.restored")?.length, 1);
  });

  it("gives each method its request's signal, so a request cancelled before its turn never runs", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const folder = { identity: CheckpointsHarness.identity, path: harness.folder };
    await harness.writeAsync("a.txt", "a");
    const first = await harness.checkpointAsync(null);
    const plan = JsonFixture.fieldOf(await harness.context.callAsync("checkpoints.previewRestore", { folder, checkpoint: first.id, paths: null }), "plan");
    const cancel = new AbortController();
    cancel.abort(new Error("cancelled by its caller"));
    const calls: readonly (readonly [string, JsonValue])[] = [
      ["checkpoints.capture", { folder, label: null, asOf: null }],
      ["checkpoints.list", { folder }],
      ["checkpoints.compare", { folder, from: first.id, to: null }],
      ["checkpoints.read", { folder, checkpoint: first.id, path: "a.txt", against: null, limit: 1 }],
      ["checkpoints.previewRestore", { folder, checkpoint: first.id, paths: null }],
      ["checkpoints.restore", { folder, plan }],
      ["checkpoints.storage", {}],
      ["checkpoints.deleteFolder", { folder }]
    ];
    const start = harness.context.requests.length;

    for (const [method, payload] of calls)
      await assert.rejects(harness.context.callAsync(method, payload, cancel.signal), /cancelled by its caller/);

    assert.deepEqual(harness.commandsSince(start), []);
    assert.equal((await harness.listAsync()).length, 1);
  });

  it("answers checkpoints.storage and checkpoints.deleteFolder in their wire forms", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const folder = { identity: CheckpointsHarness.identity, path: harness.folder };
    await harness.writeAsync("a.txt", "alpha");
    await harness.checkpointAsync(null);

    const before = StorageList.fromJson(await harness.context.callAsync("checkpoints.storage", {}));
    const deleted = DeleteFolderResult.fromJson(await harness.context.callAsync("checkpoints.deleteFolder", { folder }));
    const after = StorageList.fromJson(await harness.context.callAsync("checkpoints.storage", {}));

    assert.deepEqual([before.folders.map(u => [u.identity, u.path]), deleted.outcome.value, after.folders], [[[CheckpointsHarness.identity, harness.folder]], "Deleted", []]);
  });

  it("answers a request holding a value its model refuses as invalid parameters, with the refusal's message and the refusal as its cause, for each method that takes a value", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const folder = { identity: CheckpointsHarness.identity, path: harness.folder };
    const badFolder = { identity: "a b", path: harness.folder };
    const refused = (cause: new (...args: never[]) => Error) => (error: unknown): boolean => error instanceof MethodFailureException
      && error.failure.code === FailureCode.InvalidParams && error.cause instanceof cause && error.failure.message === error.cause.message
      && error.message === error.cause.message;

    await assert.rejects(harness.context.callAsync("checkpoints.capture", { folder: badFolder, label: null, asOf: null }), refused(InvalidIdentityException));
    await assert.rejects(harness.context.callAsync("checkpoints.list", { folder: badFolder }), refused(InvalidIdentityException));
    await assert.rejects(harness.context.callAsync("checkpoints.compare", { folder, from: "1", to: null }), refused(InvalidCheckpointIdException));
    await assert.rejects(harness.context.callAsync("checkpoints.previewRestore", { folder, checkpoint: "1", paths: null }), refused(InvalidCheckpointIdException));
    await assert.rejects(harness.context.callAsync("checkpoints.restore", { folder: badFolder, plan: null }), refused(InvalidIdentityException));
    await assert.rejects(harness.context.callAsync("checkpoints.read", {
      folder, checkpoint: CheckpointsHarness.unknownId, path: "../a.txt", against: null, limit: 1
    }), refused(InvalidRelativePathException));
    await assert.rejects(harness.context.callAsync("checkpoints.deleteFolder", { folder: badFolder }), refused(InvalidIdentityException));
  });

  it("refuses a request that isn't the method's wire form with the JSON failure itself", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const folder = { identity: CheckpointsHarness.identity, path: harness.folder };

    await assert.rejects(harness.context.callAsync("checkpoints.capture", { folder, label: 1, asOf: null }), new JsonException("Expected a string.", "CaptureRequest.label"));
    await assert.rejects(harness.context.callAsync("checkpoints.list", {}), new JsonException("The field is required.", "ListRequest.folder"));
    await assert.rejects(harness.context.callAsync("checkpoints.restore", { folder, plan: null }), new JsonException("Expected a JSON object.", "RestorePlan"));
    await assert.rejects(harness.context.callAsync("checkpoints.storage", { folder }), new JsonException("The field is not part of this message, which accepts no unknown fields.", "StorageRequest.folder"));
    await assert.rejects(harness.context.callAsync("checkpoints.deleteFolder", {}), new JsonException("The field is required.", "DeleteFolderRequest.folder"));
  });

  it("runs none of its service's requests once turned off, so none runs beside those of the service it publishes once on again", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const folder = { identity: CheckpointsHarness.identity, path: harness.folder };
    await harness.writeAsync("a.txt", "alpha");
    const first = await harness.checkpointAsync(null);
    await harness.writeAsync("a.txt", "beta");
    const plan = JsonFixture.fieldOf(await harness.context.callAsync("checkpoints.previewRestore", { folder, checkpoint: first.id, paths: null }), "plan");
    const old = harness.context.services.get("checkpoints.service");
    assert.ok(old instanceof CheckpointsService);
    const { promise: turnedOff, resolve: turnOff } = Promise.withResolvers<Promise<void>>();
    let waiting: Promise<void> = Promise.resolve();
    harness.context.watchInput = command => {
      if (command !== "fast-import")
        return;
      harness.context.watchInput = () => undefined;
      waiting = assert.rejects(harness.context.callAsync("checkpoints.restore", { folder, plan }), { name: "AbortError" });
      turnOff(harness.deactivateAsync());
    };

    const running = assert.rejects(harness.context.callAsync("checkpoints.capture", { folder, label: null, asOf: null }), { name: "AbortError" });
    await await turnedOff;
    const left = [harness.context.running.length, await readFile(path.join(harness.folder, "a.txt"), "utf8")];
    await running;
    await waiting;
    await assert.rejects(old.listAsync(new ListRequest(harness.reference)), { name: "AbortError" });
    harness.clock.tick(1_000);
    await harness.activateAsync();
    const restored = RestoreResult.fromJson(await harness.context.callAsync("checkpoints.restore", { folder, plan }));
    const listed = CheckpointList.fromJson(await harness.context.callAsync("checkpoints.list", { folder }));

    assert.deepEqual(left, [0, "beta"]);
    assert.deepEqual([restored.outcome.value, await readFile(path.join(harness.folder, "a.txt"), "utf8")], ["Restored", "alpha"]);
    assert.deepEqual(listed.checkpoints.map(u => u.label), ["Before restore", null]);
  });
});

describe("ModuleActivation's order", { concurrency: true }, () => {
  it("starts no background work when registering a method fails, so nothing is left running that no stop reaches", async t => {
    const context = new UnstartedContext(t, await moduleFolderAsync(t, "checkpoints-unregistered-"), null, null);
    const failure = new Error("The method can't be registered.");
    context.answer("registerMethod", () => {
      throw failure;
    });

    await assert.rejects(ModuleActivation.activateAsync(context, new ManualClock()), failure);
    await new Promise<void>(resolve => setImmediate(resolve));

    assert.deepEqual(context.requests, []);
  });
});
