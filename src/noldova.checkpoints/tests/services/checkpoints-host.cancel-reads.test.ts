/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CompareRequest, PreviewRequest, type Checkpoint } from "@noldova/checkpoints.protocol";

import { CancelFixture } from "../fixtures/cancel.fixture.ts";
import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";

describe("CheckpointsHost's requests cancelled between two reads", () => {
  const names: readonly string[] = ["a.txt", "b.txt", "c.txt", "d.txt"];

  const changedAsync = async (harness: CheckpointsHarness): Promise<Checkpoint> => {
    for (const name of names)
      await harness.writeAsync(name, name);
    const checkpoint = await harness.checkpointAsync(null);
    for (const name of names)
      await harness.writeAsync(name, `${name} 2`);
    return checkpoint;
  };

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
});
