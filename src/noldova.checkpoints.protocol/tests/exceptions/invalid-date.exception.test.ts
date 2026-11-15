/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InvalidDateException, ProtocolException } from "@noldova/checkpoints.protocol";

describe("InvalidDateException", { concurrency: true }, () => {
  it("says a checkpoint's time must be a valid date", () => {
    const exception = new InvalidDateException();

    assert.equal(exception.name, "InvalidDateException");
    assert.equal(exception.message, "A checkpoint's time must be a valid date.");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
