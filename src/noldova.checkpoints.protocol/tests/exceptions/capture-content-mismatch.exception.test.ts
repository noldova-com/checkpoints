/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CaptureContentMismatchException, CaptureOutcome, ProtocolException } from "@noldova/checkpoints.protocol";

describe("CaptureContentMismatchException", { concurrency: true }, () => {
  it("names the outcome the content size disagrees with", () => {
    const exception = new CaptureContentMismatchException(CaptureOutcome.Captured);

    assert.equal(exception.name, "CaptureContentMismatchException");
    assert.equal(exception.message, "A capture result holds the content size and its limit exactly when its outcome is TooLarge; the outcome is Captured.");
    assert.equal(exception.outcome, CaptureOutcome.Captured);
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
