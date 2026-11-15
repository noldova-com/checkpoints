/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ProtocolException, UnknownCompareOutcomeException } from "@noldova/checkpoints.protocol";

describe("UnknownCompareOutcomeException", { concurrency: true }, () => {
  it("names the wire value that is no compare outcome", () => {
    const exception = new UnknownCompareOutcomeException("Paused");

    assert.equal(exception.name, "UnknownCompareOutcomeException");
    assert.equal(exception.message, "\"Paused\" is not a known compare outcome.");
    assert.equal(exception.value, "Paused");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
