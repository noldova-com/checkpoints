/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ChangeStatus, ProtocolException, UnreadReasonMismatchException } from "@noldova/checkpoints.protocol";

describe("UnreadReasonMismatchException", { concurrency: true }, () => {
  it("names the status the reason disagrees with", () => {
    const exception = new UnreadReasonMismatchException(ChangeStatus.Modified);

    assert.equal(exception.name, "UnreadReasonMismatchException");
    assert.equal(exception.message, "A change has a reason it couldn't be read exactly when its status is Unknown; the status is Modified.");
    assert.equal(exception.status, ChangeStatus.Modified);
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
