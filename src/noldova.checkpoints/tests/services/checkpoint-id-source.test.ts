/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CaptureMode, Checkpoint } from "@noldova/checkpoints.protocol";

import { CheckpointIdSource } from "../../src/services/checkpoint-id-source.ts";
import { ManualClock } from "../fixtures/manual-clock.fixture.ts";

describe("CheckpointIdSource", { concurrency: true }, () => {
  it("gives UUIDs of version 7 whose first 48 bits are the millisecond they were taken", () => {
    const id = new CheckpointIdSource(new ManualClock(1_800_000_000_123)).next();
    const time = Number.parseInt(id.replaceAll("-", "").slice(0, 12), 16);

    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.equal(time, 1_800_000_000_123);
    assert.doesNotThrow(() => new Checkpoint(id, new Date(), CaptureMode.EveryFile, null, []));
  });

  it("keeps ids in the order they were taken, however many fall in one millisecond", () => {
    const source = new CheckpointIdSource(new ManualClock());
    const ids = Array.from({ length: 5000 }, () => source.next());

    assert.deepEqual([...ids].sort(), ids);
    assert.equal(new Set(ids).size, ids.length);
  });
});
