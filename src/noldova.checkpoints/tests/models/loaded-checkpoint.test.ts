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

import { CheckpointRecord } from "../../src/models/checkpoint-record.ts";
import { LoadedCheckpoint } from "../../src/models/loaded-checkpoint.ts";
import { SideListing } from "../../src/models/side-listing.ts";

describe("LoadedCheckpoint", { concurrency: true }, () => {
  it("holds a checkpoint's record and what it holds", () => {
    const record = new CheckpointRecord(new Checkpoint("01890a5d-ac96-774b-bcce-b302099a8057", new Date(0), CaptureMode.EveryFile, null, []), [], [], null);
    const listing = new SideListing(new Map(), [], [], null);

    const loaded = new LoadedCheckpoint(record, listing);

    assert.deepEqual([loaded.record, loaded.listing], [record, listing]);
  });
});
