/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CaptureMode, Checkpoint, CheckpointList } from "@noldova/checkpoints.protocol";
import { JsonException } from "@noldova/context.json";

describe("CheckpointList", { concurrency: true }, () => {
  const newer = new Checkpoint("019a0b6c-7d1e-7f00-8abc-0123456789ab", new Date("2026-10-18T12:00:01.000Z"), CaptureMode.EveryFile, null, []);
  const older = new Checkpoint("019a0b6c-7d1d-7f00-8abc-0123456789ab", new Date("2026-10-18T12:00:00.000Z"), CaptureMode.EveryFile, "first", []);

  it("writes and reads its checkpoints in their order", () => {
    const list = new CheckpointList([newer, older]);

    assert.deepEqual(list.toJson(), { checkpoints: [newer.toJson(), older.toJson()] });
    assert.deepEqual(CheckpointList.fromJson(list.toJson()), list);
  });

  it("keeps its own copy of the checkpoints it was given", () => {
    const checkpoints = [newer];
    const list = new CheckpointList(checkpoints);
    checkpoints.push(older);

    assert.equal(list.checkpoints.length, 1);
  });

  it("refuses JSON whose checkpoints aren't a list", () => {
    assert.throws(() => CheckpointList.fromJson({ checkpoints: {} }), new JsonException("Expected an array.", "CheckpointList.checkpoints"));
  });

  it("refuses JSON with another field", () => {
    assert.throws(() => CheckpointList.fromJson({ checkpoints: [], folder: null }), new JsonException("The field is not part of this message, which accepts no unknown fields.", "CheckpointList.folder"));
  });

  it("refuses JSON missing any of its fields", () => {
    const json = { checkpoints: [] };

    for (const field of Object.keys(json))
      assert.throws(() => CheckpointList.fromJson(Object.fromEntries(Object.entries(json).filter(([key]) => key !== field))), new JsonException("The field is required.", `CheckpointList.${field}`));
  });
});
