/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import {
  CaptureRequest,
  CompareRequest,
  DiffTarget,
  ListRequest,
  PreviewRequest,
  ReadRequest,
  RestoreOutcome,
  RestoreRequest,
  type Checkpoint,
  type RestoreResult
} from "@noldova/checkpoints.protocol";

import { CancelFixture } from "../fixtures/cancel.fixture.ts";
import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";

describe("CheckpointsHost's cancels", () => {
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
});
