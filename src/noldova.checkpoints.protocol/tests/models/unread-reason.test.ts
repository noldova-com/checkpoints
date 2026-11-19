/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { UnknownUnreadReasonException, UnreadReason } from "@noldova/checkpoints.protocol";

describe("UnreadReason", { concurrency: true }, () => {
  it("writes and reads each reason by its name", () => {
    for (const [reason, name] of [[UnreadReason.Changing, "Changing"], [UnreadReason.Denied, "Denied"], [UnreadReason.InvalidName, "InvalidName"], [UnreadReason.TooLarge, "TooLarge"], [UnreadReason.Unreadable, "Unreadable"]] as const) {
      assert.equal(reason.toJson(), name);
      assert.equal(UnreadReason.fromJson(name), reason);
    }
  });

  it("refuses a name it doesn't know", () => {
    assert.throws(() => UnreadReason.fromJson("Locked"), new UnknownUnreadReasonException("Locked"));
  });
});
