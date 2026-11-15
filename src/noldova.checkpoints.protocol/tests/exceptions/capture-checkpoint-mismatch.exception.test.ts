/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CaptureCheckpointMismatchException, CaptureOutcome, ProtocolException } from "@noldova/checkpoints.protocol";

describe("CaptureCheckpointMismatchException", { concurrency: true }, () => {
  it("names the outcome a checkpoint disagrees with", () => {
    const exception = new CaptureCheckpointMismatchException(CaptureOutcome.FolderMissing);

    assert.equal(exception.name, "CaptureCheckpointMismatchException");
    assert.equal(exception.message, "A capture result holds a checkpoint exactly when its outcome is Captured; the outcome is FolderMissing.");
    assert.equal(exception.outcome, CaptureOutcome.FolderMissing);
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
