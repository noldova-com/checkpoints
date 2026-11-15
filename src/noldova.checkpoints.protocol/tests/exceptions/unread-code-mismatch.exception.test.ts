/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ProtocolException, UnreadCodeMismatchException, UnreadReason } from "@noldova/checkpoints.protocol";

describe("UnreadCodeMismatchException", { concurrency: true }, () => {
  it("names the reason the code disagrees with", () => {
    const exception = new UnreadCodeMismatchException(UnreadReason.Denied);

    assert.equal(exception.name, "UnreadCodeMismatchException");
    assert.equal(exception.message, "A path that couldn't be read has an error code exactly when its reason is Unreadable; the reason is Denied.");
    assert.equal(exception.reason, UnreadReason.Denied);
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
