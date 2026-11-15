/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CompareChangesMismatchException, CompareOutcome, ProtocolException } from "@noldova/checkpoints.protocol";

describe("CompareChangesMismatchException", { concurrency: true }, () => {
  it("names the outcome the changes disagree with", () => {
    const exception = new CompareChangesMismatchException(CompareOutcome.FolderMissing);

    assert.equal(exception.name, "CompareChangesMismatchException");
    assert.equal(exception.message, "A compare result holds changes only when its outcome is Compared; the outcome is FolderMissing.");
    assert.equal(exception.outcome, CompareOutcome.FolderMissing);
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
