/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CompareRequest, type Checkpoint } from "@noldova/checkpoints.protocol";

import { CancelFixture } from "../fixtures/cancel.fixture.ts";
import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";

describe("CheckpointsHost's compare cancelled while it describes", () => {
  const names: readonly string[] = ["a.txt", "b.txt", "c.txt", "d.txt"];

  const changedAsync = async (harness: CheckpointsHarness): Promise<Checkpoint> => {
    for (const name of names)
      await harness.writeAsync(name, name);
    const checkpoint = await harness.checkpointAsync(null);
    for (const name of names)
      await harness.writeAsync(name, `${name} 2`);
    return checkpoint;
  };

  it("stops a compare cancelled while it describes the changes it found", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const checkpoint = await changedAsync(harness);
    const cancel = new CancelFixture(t, 10);

    await assert.rejects(harness.service.compareAsync(new CompareRequest(harness.reference, checkpoint.id, null), cancel.signal), cancel.reason);

    assert.equal(cancel.checks, 10);
    assert.deepEqual(harness.context.running, []);
  });
});
