/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PreviewOutcome, UnknownPreviewOutcomeException } from "@noldova/checkpoints.protocol";

describe("PreviewOutcome", { concurrency: true }, () => {
  it("writes and reads each outcome by its name, and says which planned", () => {
    const outcomes = [PreviewOutcome.Planned, PreviewOutcome.CheckpointMissing, PreviewOutcome.FolderMissing, PreviewOutcome.HeldUp];
    assert.deepEqual(outcomes.map(t => [t.toJson(), t.isPlanned]),
      [["Planned", true], ["CheckpointMissing", false], ["FolderMissing", false], ["HeldUp", false]]);
    for (const outcome of outcomes)
      assert.equal(PreviewOutcome.fromJson(outcome.toJson()), outcome);
  });

  it("refuses a name it doesn't know", () => {
    assert.throws(() => PreviewOutcome.fromJson("Compared"), new UnknownPreviewOutcomeException("Compared"));
  });
});
