/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ChangeSidesMismatchException, ChangeStatus, ProtocolException } from "@noldova/checkpoints.protocol";

describe("ChangeSidesMismatchException", { concurrency: true }, () => {
  it("names the status the sides disagree with", () => {
    const exception = new ChangeSidesMismatchException(ChangeStatus.Added);

    assert.equal(exception.name, "ChangeSidesMismatchException");
    assert.equal(exception.message, "A change has a side before exactly when it isn't Added, and one after exactly when it isn't Deleted, but when it's Unknown; the status is Added.");
    assert.equal(exception.status, ChangeStatus.Added);
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
