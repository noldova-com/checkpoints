/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ReadOutcome, UnknownReadOutcomeException } from "@noldova/checkpoints.protocol";

describe("ReadOutcome", { concurrency: true }, () => {
  it("writes and reads each outcome by its name, and says which read", () => {
    const outcomes = [ReadOutcome.Read, ReadOutcome.FolderMissing, ReadOutcome.CheckpointMissing, ReadOutcome.PathMissing, ReadOutcome.Unknown, ReadOutcome.Binary];

    assert.deepEqual(outcomes.map(t => [t.toJson(), t.isRead]), [
      ["Read", true], ["FolderMissing", false], ["CheckpointMissing", false], ["PathMissing", false], ["Unknown", false], ["Binary", false]
    ]);
    assert.deepEqual(outcomes.map(t => ReadOutcome.fromJson(t.value)), outcomes);
  });

  it("refuses a name it doesn't know", () => {
    assert.throws(() => ReadOutcome.fromJson("Cut"), new UnknownReadOutcomeException("Cut"));
  });
});
