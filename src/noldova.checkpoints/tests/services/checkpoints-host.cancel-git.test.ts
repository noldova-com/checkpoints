/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CompareRequest,
  DiffTarget,
  ListRequest,
  PreviewRequest,
  ReadRequest,
  type Checkpoint
} from "@noldova/checkpoints.protocol";

import { CancelFixture } from "../fixtures/cancel.fixture.ts";
import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";

describe("CheckpointsHost's requests cancelled while Git runs", () => {
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
});
