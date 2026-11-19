/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  CompareRequest,
  PreviewRequest,
  RestoreOutcome,
  RestoreRequest,
  type Checkpoint
} from "@noldova/checkpoints.protocol";

import { CancelFixture } from "../fixtures/cancel.fixture.ts";
import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";

describe("CheckpointsHost's requests cancelled mid-walk", () => {
  const names: readonly string[] = ["a.txt", "b.txt", "c.txt", "d.txt"];

  const changedAsync = async (harness: CheckpointsHarness): Promise<Checkpoint> => {
    for (const name of names)
      await harness.writeAsync(name, name);
    const checkpoint = await harness.checkpointAsync(null);
    for (const name of names)
      await harness.writeAsync(name, `${name} 2`);
    return checkpoint;
  };

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
});
