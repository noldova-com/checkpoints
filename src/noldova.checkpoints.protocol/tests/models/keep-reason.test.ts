/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { KeepReason, UnknownKeepReasonException } from "@noldova/checkpoints.protocol";

describe("KeepReason", { concurrency: true }, () => {
  it("writes and reads each reason by its name", () => {
    const reasons = [KeepReason.Repository, KeepReason.RepositoryFolder, KeepReason.Ignored, KeepReason.Unread, KeepReason.LinkUnsupported, KeepReason.TooLarge];
    assert.deepEqual(reasons.map(t => t.toJson()), ["Repository", "RepositoryFolder", "Ignored", "Unread", "LinkUnsupported", "TooLarge"]);
    for (const reason of reasons)
      assert.equal(KeepReason.fromJson(reason.toJson()), reason);
  });

  it("refuses a name it doesn't know", () => {
    assert.throws(() => KeepReason.fromJson("Locked"), new UnknownKeepReasonException("Locked"));
  });
});
