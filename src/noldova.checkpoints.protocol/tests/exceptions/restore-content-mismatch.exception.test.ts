/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ProtocolException, RestoreContentMismatchException, RestoreOutcome } from "@noldova/checkpoints.protocol";

describe("RestoreContentMismatchException", { concurrency: true }, () => {
  it("names the outcome the content size disagrees with", () => {
    const exception = new RestoreContentMismatchException(RestoreOutcome.MovedOn);

    assert.equal(exception.name, "RestoreContentMismatchException");
    assert.equal(exception.message, "A restore result holds the content size and its limit exactly when its outcome is TooLarge; the outcome is MovedOn.");
    assert.equal(exception.outcome, RestoreOutcome.MovedOn);
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
