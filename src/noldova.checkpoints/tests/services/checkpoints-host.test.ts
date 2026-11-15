/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { setImmediate } from "node:timers/promises";

import {
  CaptureMode,
  CaptureOutcome,
  CaptureRequest,
  CompareOutcome,
  CompareRequest,
  DiffTarget,
  FolderReference,
  ListRequest,
  PreviewRequest,
  ReadOutcome,
  ReadRequest,
  RestoreOutcome,
  RestoreRequest,
  type Checkpoint,
  type RestoreResult
} from "@noldova/checkpoints.protocol";

import { CancelFixture } from "../fixtures/cancel.fixture.ts";
import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";
import { ServiceSeams } from "../fixtures/service-seams.fixture.ts";

describe("CheckpointsHost", { concurrency: true }, () => {
  const uncancelled: AbortSignal = new AbortController().signal;
  const names: readonly string[] = ["a.txt", "b.txt", "c.txt", "d.txt"];

  const changedAsync = async (harness: CheckpointsHarness): Promise<Checkpoint> => {
    for (const name of names)
      await harness.writeAsync(name, name);
    const checkpoint = await harness.checkpointAsync(null);
    for (const name of names)
      await harness.writeAsync(name, `${name} 2`);
    return checkpoint;
  };

  it("stops a capture cancelled mid-walk or while its content streams, leaving no checkpoint, its index as it was and no Git running", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const first = await changedAsync(harness);
    const index = await readFile(path.join(harness.store, "index"));
    const captureAsync = (signal: AbortSignal): Promise<unknown> => harness.service.captureAsync(new CaptureRequest(harness.reference, null), signal);
    const walking = new CancelFixture(t, 3);
    const streaming = new CancelFixture(t);
    let writes = 0;
    harness.context.watchInput = command => {
      if (command === "fast-import" && ++writes === 2)
        streaming.cancel();
    };

    await assert.rejects(captureAsync(walking.signal), walking.reason);
    await assert.rejects(captureAsync(streaming.signal), streaming.reason);

    assert.equal(walking.checks, 3);
    assert.deepEqual(harness.context.running, []);
    assert.deepEqual((await harness.listAsync()).map(u => u.id), [first.id]);
    assert.deepEqual(await readFile(path.join(harness.store, "index")), index);
    const next = await harness.checkpointAsync(null);
    assert.equal((await harness.contentAsync(next, "files/d.txt")).toString(), "d.txt 2");
  });

  it("stops a list, compare, read or preview cancelled while its Git runs, with no Git left running, and runs the next request", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const checkpoint = await changedAsync(harness);
    const requests: readonly ((signal: AbortSignal) => Promise<unknown>)[] = [
      u => harness.service.listAsync(new ListRequest(harness.reference), u),
      u => harness.service.compareAsync(new CompareRequest(harness.reference, checkpoint.id, null), u),
      u => harness.service.readAsync(new ReadRequest(harness.reference, checkpoint.id, "a.txt", new DiffTarget(null), 1024), u),
      u => harness.service.previewRestoreAsync(new PreviewRequest(harness.reference, checkpoint.id, null), u)
    ];

    for (const requestAsync of requests) {
      const cancel = new CancelFixture(t);
      harness.context.watchStart = () => cancel.cancel();
      await assert.rejects(requestAsync(cancel.signal), cancel.reason);
      assert.deepEqual(harness.context.running, []);
      harness.context.watchStart = () => undefined;
      await assert.doesNotReject(requestAsync(uncancelled));
    }
  });

  it("stops a compare, preview or restore cancelled mid-walk of the folder now, and runs the next request", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const checkpoint = await changedAsync(harness);
    const plan = await harness.planAsync(checkpoint);
    const changed = await harness.snapshotAsync();
    const requests: readonly ((signal: AbortSignal) => Promise<unknown>)[] = [
      u => harness.service.compareAsync(new CompareRequest(harness.reference, checkpoint.id, null), u),
      u => harness.service.previewRestoreAsync(new PreviewRequest(harness.reference, checkpoint.id, null), u),
      u => harness.service.restoreAsync(new RestoreRequest(harness.reference, plan), u)
    ];

    for (const requestAsync of requests) {
      const cancel = new CancelFixture(t, 3);
      await assert.rejects(requestAsync(cancel.signal), cancel.reason);
      assert.equal(cancel.checks, 3);
      assert.deepEqual(harness.context.running, []);
    }

    assert.deepEqual(await harness.snapshotAsync(), changed);
    assert.equal(existsSync(path.join(harness.store, "restore.json")), false);
    assert.equal((await harness.restoreAsync(plan)).outcome, RestoreOutcome.Restored);
  });

  it("stops a compare or preview cancelled between two files it reads of the folder now", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const checkpoint = await changedAsync(harness);
    const requests: readonly ((signal: AbortSignal) => Promise<unknown>)[] = [
      u => harness.service.compareAsync(new CompareRequest(harness.reference, checkpoint.id, null), u),
      u => harness.service.previewRestoreAsync(new PreviewRequest(harness.reference, checkpoint.id, null), u)
    ];

    for (const requestAsync of requests) {
      const cancel = new CancelFixture(t, 7);
      await assert.rejects(requestAsync(cancel.signal), cancel.reason);
      assert.equal(cancel.checks, 7);
    }
  });

  it("stops a compare cancelled while it describes the changes it found", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const checkpoint = await changedAsync(harness);
    const cancel = new CancelFixture(t, 10);

    await assert.rejects(harness.service.compareAsync(new CompareRequest(harness.reference, checkpoint.id, null), cancel.signal), cancel.reason);

    assert.equal(cancel.checks, 10);
    assert.deepEqual(harness.context.running, []);
  });

  it("stops a restore cancelled before it writes its journal, changing nothing, and carries one cancelled after to its end", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    for (const name of names)
      await harness.writeAsync(name, name);
    const original = await harness.snapshotAsync();
    const first = await changedAsync(harness);
    const plan = await harness.planAsync(first);
    const changed = await harness.snapshotAsync();
    const journal = path.join(harness.store, "restore.json");
    const restoreAsync = (signal: AbortSignal): Promise<RestoreResult> => harness.service.restoreAsync(new RestoreRequest(harness.reference, plan), signal);
    const early = new CancelFixture(t);
    const late = new CancelFixture(t);

    harness.context.watchInput = command => {
      if (command === "fast-import")
        early.cancel();
    };
    await assert.rejects(restoreAsync(early.signal), early.reason);
    assert.deepEqual(await harness.snapshotAsync(), changed);
    assert.equal(existsSync(journal), false);
    assert.deepEqual((await harness.listAsync()).map(u => u.id), [first.id]);
    assert.deepEqual(harness.context.running, []);

    harness.context.watchInput = () => undefined;
    harness.context.watchStart = command => {
      if (command === "cat-file" && existsSync(journal))
        late.cancel();
    };
    const restored = await restoreAsync(late.signal);

    assert.equal(late.signal.aborted, true);
    assert.equal(restored.outcome, RestoreOutcome.Restored);
    assert.deepEqual(await harness.snapshotAsync(), original);
    assert.equal(existsSync(journal), false);
    assert.deepEqual(harness.context.running, []);
  });

  it("stops a restore cancelled once its checkpoint before it is taken, before its journal, keeping that checkpoint and changing nothing", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const first = await changedAsync(harness);
    const plan = await harness.planAsync(first);
    const changed = await harness.snapshotAsync();
    const cancel = new CancelFixture(t);
    harness.context.watchInput = (command, chunk) => {
      if (command === "fast-import" && chunk.includes("get-mark"))
        harness.context.started.findLast(u => u.command === "fast-import")?.owned.output.once("readable", () => cancel.cancel());
    };

    await assert.rejects(harness.service.restoreAsync(new RestoreRequest(harness.reference, plan), cancel.signal), cancel.reason);

    assert.deepEqual(await harness.snapshotAsync(), changed);
    assert.equal(existsSync(path.join(harness.store, "restore.json")), false);
    const listed = await harness.listAsync();
    assert.deepEqual(listed.map(u => u.label), ["Before restore", first.label]);
    const [before] = listed;
    assert.ok(before);
    assert.equal((await harness.contentAsync(before, "files/a.txt")).toString(), "a.txt 2");
    assert.deepEqual(harness.context.running, []);
  });

  it("posts the low-disk-space notification for a capture without the space, replaces it at the next, and dismisses it at one taken after", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const margin = 2 * 1024 * 1024 * 1024;
    let free = 1024 * 1024 * 1024;
    const service = await harness.createServiceAsync(ServiceSeams.system.withReadFree(async () => free));
    const captureAsync = async (): Promise<CaptureOutcome> => (await service.captureAsync(new CaptureRequest(harness.reference, null))).outcome;
    const shown = (): readonly (readonly [string, string | null, string, string | null, string])[] =>
      harness.context.notifications.map(u => [u.kind.text, u.key, u.title, u.text, u.severity]);
    await harness.writeAsync("a.txt", "alpha");

    assert.equal(await captureAsync(), CaptureOutcome.LowDiskSpace);
    const first = shown();
    free = 512 * 1024 * 1024;
    assert.equal(await captureAsync(), CaptureOutcome.LowDiskSpace);
    const second = shown();
    free = margin + 5;
    assert.equal(await captureAsync(), CaptureOutcome.Captured);

    assert.deepEqual(first, [["checkpoints.lowDiskSpace", CheckpointsHarness.identity, "Checkpoints paused",
      "1.0 GiB free on the disk that keeps checkpoints; a checkpoint needs 2.0 GiB.", "Warning"]]);
    assert.deepEqual(second.map(u => u[3]), ["0.5 GiB free on the disk that keeps checkpoints; a checkpoint needs 2.0 GiB."]);
    assert.deepEqual(shown(), []);
  });

  it("takes and lists a folder's checkpoints under its identity, wherever the folder is now", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const moved = path.join(harness.root, "moved");
    await harness.writeAsync("a.txt", "alpha");
    const first = await harness.checkpointAsync("before the move");
    await mkdir(moved);

    const second = await harness.service.captureAsync(new CaptureRequest(new FolderReference(CheckpointsHarness.identity, moved), "after"));
    const listed = await harness.service.listAsync(new ListRequest(new FolderReference(CheckpointsHarness.identity, moved)));

    assert.equal(second.outcome, CaptureOutcome.Captured);
    assert.deepEqual(listed.checkpoints.map(u => u.label), ["after", first.label]);
    assert.deepEqual(await harness.readStoreFileAsync("folder.json"), { formatVersion: 1, path: moved });
  });

  it("keeps each identity's checkpoints apart", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.checkpointAsync(null);

    const other = await harness.service.listAsync(new ListRequest(new FolderReference("project-2", harness.folder)));

    assert.deepEqual(other.checkpoints, []);
  });

  it("runs one folder's captures and lists one at a time, so each sees the one before it", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "alpha");

    const [first, listed, second] = await Promise.all([harness.checkpointAsync("1"), harness.listAsync(), harness.checkpointAsync("2")]);

    assert.deepEqual(listed.map(u => u.id), [first.id]);
    const parent = (await harness.gitAsync(["rev-parse", `refs/checkpoints/${second.id}^`])).toString("utf8").trim();
    assert.equal(parent, (await harness.gitAsync(["rev-parse", `refs/checkpoints/${first.id}`])).toString("utf8").trim());
  });

  it("runs a folder's compares and reads in its queue with its captures, each whole", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "alpha\n");
    const first = await harness.checkpointAsync(null);
    await harness.writeAsync("a.txt", "alpha 2\n");

    const [second, compared, read] = await Promise.all([harness.checkpointAsync(null), harness.compareAsync(first, null), harness.readAsync(first, "a.txt", "now")]);

    assert.deepEqual(compared.changes.map(u => [u.path, u.status.value]), [["a.txt", "Modified"]]);
    assert.equal(Buffer.from(read.content).toString(), "@@ -1 +1 @@\n-alpha\n+alpha 2\n");
    assert.deepEqual((await harness.compareAsync(first, second)).changes.map(u => u.path), ["a.txt"]);
  });

  it("compares and reads under the folder's identity, wherever the folder is now", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "alpha");
    const checkpoint = await harness.checkpointAsync(null);
    const moved = new FolderReference(CheckpointsHarness.identity, path.join(harness.root, "moved"));
    const other = new FolderReference("project-2", harness.folder);

    const compared = await harness.service.compareAsync(new CompareRequest(moved, checkpoint.id, null));
    const read = await harness.service.readAsync(new ReadRequest(moved, checkpoint.id, "a.txt", null, 10));
    const elsewhere = await harness.service.readAsync(new ReadRequest(other, checkpoint.id, "a.txt", null, 10));

    assert.equal(compared.outcome, CompareOutcome.FolderMissing);
    assert.equal(Buffer.from(read.content).toString(), "alpha");
    assert.equal(elsewhere.outcome, ReadOutcome.CheckpointMissing);
  });

  it("takes each checkpoint in the mode the setting has as it starts, keeping again what the ignore files left out once it's off", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync(".gitignore", "*.log\n");
    await harness.writeAsync("a.log", "log");
    harness.context.settings.write("checkpoints.followIgnoreFiles", true);
    const following = await harness.checkpointAsync(null);
    harness.context.settings.write("checkpoints.followIgnoreFiles", false);
    const every = await harness.checkpointAsync(null);

    assert.equal((await harness.treeAsync(following)).has("files/a.log"), false);
    assert.equal((await harness.treeAsync(every)).has("files/a.log"), true);
    assert.deepEqual([following.mode, every.mode], [CaptureMode.IgnoreFiles, CaptureMode.EveryFile]);
    assert.equal((await harness.treeAsync(every)).has("rules/.gitignore"), false);
  });
});

describe("CheckpointsHost's housekeeping", { concurrency: true }, () => {
  const passedAsync = async (harness: CheckpointsHarness): Promise<void> => await CheckpointsHarness.appearedAsync(path.join(harness.store, "housekeeping.json"));

  it("packs and prunes a folder's store once no request for it has come for the delay after a capture, and not a millisecond before", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const service = harness.service;
    await harness.writeAsync("a.txt", "a.txt");
    const start = harness.context.requests.length;

    await service.captureAsync(new CaptureRequest(harness.reference, null));
    const captured = harness.context.requests.length;
    const passed = passedAsync(harness);
    harness.clock.tick(29_999);
    await setImmediate();
    const early = [harness.commandsSince(captured), existsSync(path.join(harness.store, "housekeeping.json")), harness.clock.pending.includes(1)];
    harness.clock.tick(1);
    await passed;

    assert.deepEqual(early, [[], false, true]);
    assert.deepEqual(harness.commandsSince(start).slice(-4), ["count-objects", "pack-refs", "repack", "prune"]);
    assert.match((await harness.gitAsync(["count-objects", "-v"])).toString("utf8"), /^count: 0$/m);
    assert.equal((await harness.listAsync()).length, 1);
  });

  it("stops a pass when a request for the folder comes during it, so the request waits only for its Git command, and passes again after", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const service = harness.service;
    await harness.writeAsync("a.txt", "a.txt");
    await harness.writeAsync("large.bin", randomBytes(64 * 1024 * 1024));
    const { promise: listed, resolve, reject } = Promise.withResolvers<readonly Checkpoint[]>();
    harness.context.watchStart = command => {
      if (command !== "repack")
        return;
      harness.context.watchStart = () => undefined;
      service.listAsync(new ListRequest(harness.reference)).then(u => resolve(u.checkpoints), reject);
    };

    await service.captureAsync(new CaptureRequest(harness.reference, null));
    harness.clock.tick(30_000);

    assert.equal((await listed).length, 1);
    assert.deepEqual([harness.context.started.filter(u => u.command === "repack").length, harness.context.running.length], [1, 0]);
    assert.equal(existsSync(path.join(harness.store, "housekeeping.json")), false);
    const passed = passedAsync(harness);
    harness.clock.tick(30_000);
    await passed;
    assert.equal((await harness.context.started.filter(u => u.command === "repack").at(-1)?.owned.exited)?.code, 0);
  });
});
