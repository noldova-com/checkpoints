/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CompareOutcome, UnknownCompareOutcomeException } from "@noldova/checkpoints.protocol";

describe("CompareOutcome", { concurrency: true }, () => {
  it("writes and reads each outcome by its name, and says which compared", () => {
    const outcomes = [CompareOutcome.Compared, CompareOutcome.FolderMissing, CompareOutcome.CheckpointMissing];

    assert.deepEqual(outcomes.map(t => [t.toJson(), t.isCompared]), [["Compared", true], ["FolderMissing", false], ["CheckpointMissing", false]]);
    assert.deepEqual(outcomes.map(t => CompareOutcome.fromJson(t.value)), outcomes);
  });

  it("refuses a name it doesn't know", () => {
    assert.throws(() => CompareOutcome.fromJson("Paused"), new UnknownCompareOutcomeException("Paused"));
  });
});
