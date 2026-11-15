/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ProtocolException, RestoreCheckpointsMismatchException, RestoreOutcome } from "@noldova/checkpoints.protocol";

describe("RestoreCheckpointsMismatchException", { concurrency: true }, () => {
  it("names the outcome the checkpoints disagree with", () => {
    const exception = new RestoreCheckpointsMismatchException(RestoreOutcome.MovedOn);

    assert.equal(exception.name, "RestoreCheckpointsMismatchException");
    assert.equal(exception.message, "A restore result holds the checkpoint before exactly when its outcome is Restored or RolledBack, and a recovered one only when it is Restored; the outcome is MovedOn.");
    assert.equal(exception.outcome, RestoreOutcome.MovedOn);
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
