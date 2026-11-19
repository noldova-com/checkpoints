/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { CaptureRequest, type Checkpoint } from "@noldova/checkpoints.protocol";

import { CancelFixture } from "../fixtures/cancel.fixture.ts";
import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";

describe("CheckpointsHost's cancelled capture", () => {
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
});
