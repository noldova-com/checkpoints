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
  CaptureCheckpointMismatchException, CaptureContentMismatchException, CaptureMode, CaptureOutcome, CaptureResult, CaptureSpaceMismatchException, Checkpoint,
  InvalidSizeException
} from "@noldova/checkpoints.protocol";
import { JsonException } from "@noldova/context.json";

describe("CaptureResult", { concurrency: true }, () => {
  const checkpoint = new Checkpoint("019a0b6c-7d1e-7f00-8abc-0123456789ab", new Date("2026-10-18T12:00:00.000Z"), CaptureMode.EveryFile, null, []);
  const checkpointJson = { id: "019a0b6c-7d1e-7f00-8abc-0123456789ab", time: "2026-10-18T12:00:00.000Z", mode: "EveryFile", label: null, unreadPaths: [] };

  it("writes and reads a captured checkpoint", () => {
    const result = new CaptureResult(CaptureOutcome.Captured, checkpoint, null, null);

    assert.deepEqual(result.toJson(), { outcome: "Captured", checkpoint: checkpointJson, spaceFree: null, spaceNeeded: null, contentSize: null, contentLimit: null });
    assert.deepEqual(CaptureResult.fromJson({ outcome: "Captured", checkpoint: checkpointJson, spaceFree: null, spaceNeeded: null, contentSize: null, contentLimit: null }), result);
  });

  it("writes and reads a missing folder, which has no checkpoint", () => {
    const result = new CaptureResult(CaptureOutcome.FolderMissing, null, null, null);

    assert.deepEqual(result.toJson(), { outcome: "FolderMissing", checkpoint: null, spaceFree: null, spaceNeeded: null, contentSize: null, contentLimit: null });
    assert.deepEqual(CaptureResult.fromJson({ outcome: "FolderMissing", checkpoint: null, spaceFree: null, spaceNeeded: null, contentSize: null, contentLimit: null }), result);
  });

  it("holds a checkpoint exactly when its outcome is Captured", () => {
    assert.throws(() => new CaptureResult(CaptureOutcome.Captured, null, null, null),
      new CaptureCheckpointMismatchException(CaptureOutcome.Captured));
    assert.throws(() => new CaptureResult(CaptureOutcome.FolderMissing, checkpoint, null, null),
      new CaptureCheckpointMismatchException(CaptureOutcome.FolderMissing));
  });

  it("writes and reads a capture without the space, which has the space free and the space needed", () => {
    const result = new CaptureResult(CaptureOutcome.LowDiskSpace, null, 1_000, 2_147_483_648);
    const json = { outcome: "LowDiskSpace", checkpoint: null, spaceFree: 1_000, spaceNeeded: 2_147_483_648, contentSize: null, contentLimit: null };

    assert.deepEqual(result.toJson(), json);
    assert.deepEqual(CaptureResult.fromJson(json), result);
  });

  it("holds the space exactly when its outcome is LowDiskSpace, each as a whole number of bytes", () => {
    assert.throws(() => new CaptureResult(CaptureOutcome.LowDiskSpace, null, 1, null), new CaptureSpaceMismatchException(CaptureOutcome.LowDiskSpace));
    assert.throws(() => new CaptureResult(CaptureOutcome.LowDiskSpace, null, null, 1), new CaptureSpaceMismatchException(CaptureOutcome.LowDiskSpace));
    assert.throws(() => new CaptureResult(CaptureOutcome.FolderMissing, null, 1, 1), new CaptureSpaceMismatchException(CaptureOutcome.FolderMissing));
    assert.throws(() => new CaptureResult(CaptureOutcome.LowDiskSpace, null, -1, 1), new InvalidSizeException(-1));
    assert.throws(() => new CaptureResult(CaptureOutcome.LowDiskSpace, null, 1, 0.5), new InvalidSizeException(0.5));
  });

  it("writes and reads a capture with too much to write, which has the content size and its limit", () => {
    const result = new CaptureResult(CaptureOutcome.TooLarge, null, null, null, 1_288_490_189, 1_073_741_824);
    const json = { outcome: "TooLarge", checkpoint: null, spaceFree: null, spaceNeeded: null, contentSize: 1_288_490_189, contentLimit: 1_073_741_824 };

    assert.deepEqual(result.toJson(), json);
    assert.deepEqual(CaptureResult.fromJson(json), result);
    assert.deepEqual([result.contentSize, result.contentLimit], [1_288_490_189, 1_073_741_824]);
  });

  it("holds the content size and its limit exactly when its outcome is TooLarge, each as a whole number of bytes", () => {
    assert.throws(() => new CaptureResult(CaptureOutcome.TooLarge, null, null, null, 1, null), new CaptureContentMismatchException(CaptureOutcome.TooLarge));
    assert.throws(() => new CaptureResult(CaptureOutcome.TooLarge, null, null, null, null, 1), new CaptureContentMismatchException(CaptureOutcome.TooLarge));
    assert.throws(() => new CaptureResult(CaptureOutcome.TooLarge, null, null, null), new CaptureContentMismatchException(CaptureOutcome.TooLarge));
    assert.throws(() => new CaptureResult(CaptureOutcome.FolderMissing, null, null, null, 1, 1), new CaptureContentMismatchException(CaptureOutcome.FolderMissing));
    assert.throws(() => new CaptureResult(CaptureOutcome.TooLarge, null, 1, 1, 1, 1), new CaptureSpaceMismatchException(CaptureOutcome.TooLarge));
    assert.throws(() => new CaptureResult(CaptureOutcome.TooLarge, null, null, null, -1, 1), new InvalidSizeException(-1));
    assert.throws(() => new CaptureResult(CaptureOutcome.TooLarge, null, null, null, 2, 1.5), new InvalidSizeException(1.5));
  });

  it("refuses JSON with another field", () => {
    assert.throws(() => CaptureResult.fromJson({ outcome: "FolderMissing", checkpoint: null, spaceFree: null, spaceNeeded: null, contentSize: null, contentLimit: null, reason: "" }), new JsonException("The field is not part of this message, which accepts no unknown fields.", "CaptureResult.reason"));
  });

  it("refuses JSON missing any of its fields", () => {
    const json = { outcome: "FolderMissing", checkpoint: null, spaceFree: null, spaceNeeded: null, contentSize: null, contentLimit: null };

    for (const field of Object.keys(json))
      assert.throws(() => CaptureResult.fromJson(Object.fromEntries(Object.entries(json).filter(([key]) => key !== field))), new JsonException("The field is required.", `CaptureResult.${field}`));
  });
});
