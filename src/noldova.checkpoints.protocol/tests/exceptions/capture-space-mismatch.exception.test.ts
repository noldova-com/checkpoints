/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CaptureOutcome, CaptureSpaceMismatchException, ProtocolException } from "@noldova/checkpoints.protocol";

describe("CaptureSpaceMismatchException", { concurrency: true }, () => {
  it("names the outcome the space disagrees with", () => {
    const exception = new CaptureSpaceMismatchException(CaptureOutcome.Captured);

    assert.equal(exception.name, "CaptureSpaceMismatchException");
    assert.equal(exception.message, "A capture result holds the space free and the space needed exactly when its outcome is LowDiskSpace; the outcome is Captured.");
    assert.equal(exception.outcome, CaptureOutcome.Captured);
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
