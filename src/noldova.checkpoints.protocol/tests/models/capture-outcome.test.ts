/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CaptureOutcome, UnknownCaptureOutcomeException } from "@noldova/checkpoints.protocol";

describe("CaptureOutcome", { concurrency: true }, () => {
  it("writes and reads each outcome by its name, and says which took a checkpoint", () => {
    assert.deepEqual([CaptureOutcome.Captured.toJson(), CaptureOutcome.Captured.isCaptured], ["Captured", true]);
    assert.deepEqual([CaptureOutcome.FolderMissing.toJson(), CaptureOutcome.FolderMissing.isCaptured], ["FolderMissing", false]);
    assert.deepEqual([CaptureOutcome.HeldUp.toJson(), CaptureOutcome.HeldUp.isCaptured], ["HeldUp", false]);
    assert.deepEqual([CaptureOutcome.LowDiskSpace.toJson(), CaptureOutcome.LowDiskSpace.isCaptured], ["LowDiskSpace", false]);
    assert.deepEqual([CaptureOutcome.TooLarge.toJson(), CaptureOutcome.TooLarge.isCaptured], ["TooLarge", false]);
    assert.equal(CaptureOutcome.fromJson("Captured"), CaptureOutcome.Captured);
    assert.equal(CaptureOutcome.fromJson("FolderMissing"), CaptureOutcome.FolderMissing);
    assert.equal(CaptureOutcome.fromJson("HeldUp"), CaptureOutcome.HeldUp);
    assert.equal(CaptureOutcome.fromJson("LowDiskSpace"), CaptureOutcome.LowDiskSpace);
    assert.equal(CaptureOutcome.fromJson("TooLarge"), CaptureOutcome.TooLarge);
  });

  it("refuses a name it doesn't know", () => {
    assert.throws(() => CaptureOutcome.fromJson("Paused"), new UnknownCaptureOutcomeException("Paused"));
  });
});
