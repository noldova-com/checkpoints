/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ProtocolException, RestoreAction, StepSidesMismatchException } from "@noldova/checkpoints.protocol";

describe("StepSidesMismatchException", { concurrency: true }, () => {
  it("names the action the sides disagree with", () => {
    const exception = new StepSidesMismatchException(RestoreAction.Write);

    assert.equal(exception.name, "StepSidesMismatchException");
    assert.equal(exception.message, "A restore step has a side now exactly when it isn't a Write, and one in the checkpoint exactly when it isn't a Delete; the action is Write.");
    assert.equal(exception.action, RestoreAction.Write);
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
