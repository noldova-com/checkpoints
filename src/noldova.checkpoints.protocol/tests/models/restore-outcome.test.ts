/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RestoreOutcome, UnknownRestoreOutcomeException } from "@noldova/checkpoints.protocol";

describe("RestoreOutcome", { concurrency: true }, () => {
  it("writes and reads each outcome by its name, and says which restored", () => {
    const outcomes = [
      RestoreOutcome.Restored, RestoreOutcome.MovedOn, RestoreOutcome.CheckpointMissing, RestoreOutcome.FolderMissing,
      RestoreOutcome.LowDiskSpace, RestoreOutcome.HeldUp, RestoreOutcome.RolledBack
    ];
    assert.deepEqual(outcomes.map(t => [t.toJson(), t.isRestored]), [
      ["Restored", true], ["MovedOn", false], ["CheckpointMissing", false], ["FolderMissing", false],
      ["LowDiskSpace", false], ["HeldUp", false], ["RolledBack", false]
    ]);
    for (const outcome of outcomes)
      assert.equal(RestoreOutcome.fromJson(outcome.toJson()), outcome);
  });

  it("refuses a name it doesn't know", () => {
    assert.throws(() => RestoreOutcome.fromJson("Planned"), new UnknownRestoreOutcomeException("Planned"));
  });
});
