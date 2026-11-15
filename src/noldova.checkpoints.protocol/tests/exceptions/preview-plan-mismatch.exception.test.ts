/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PreviewOutcome, PreviewPlanMismatchException, ProtocolException } from "@noldova/checkpoints.protocol";

describe("PreviewPlanMismatchException", { concurrency: true }, () => {
  it("names the outcome the plan disagrees with", () => {
    const exception = new PreviewPlanMismatchException(PreviewOutcome.HeldUp);

    assert.equal(exception.name, "PreviewPlanMismatchException");
    assert.equal(exception.message, "A preview result holds a plan exactly when its outcome is Planned; the outcome is HeldUp.");
    assert.equal(exception.outcome, PreviewOutcome.HeldUp);
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
