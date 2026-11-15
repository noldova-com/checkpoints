/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ProtocolException, UnknownReadOutcomeException } from "@noldova/checkpoints.protocol";

describe("UnknownReadOutcomeException", { concurrency: true }, () => {
  it("names the wire value that is no read outcome", () => {
    const exception = new UnknownReadOutcomeException("Cut");

    assert.equal(exception.name, "UnknownReadOutcomeException");
    assert.equal(exception.message, "\"Cut\" is not a known read outcome.");
    assert.equal(exception.value, "Cut");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
