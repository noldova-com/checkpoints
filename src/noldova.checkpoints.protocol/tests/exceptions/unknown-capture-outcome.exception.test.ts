/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ProtocolException, UnknownCaptureOutcomeException } from "@noldova/checkpoints.protocol";

describe("UnknownCaptureOutcomeException", { concurrency: true }, () => {
  it("names the wire value that is no capture outcome", () => {
    const exception = new UnknownCaptureOutcomeException("Paused");

    assert.equal(exception.name, "UnknownCaptureOutcomeException");
    assert.equal(exception.message, "\"Paused\" is not a known capture outcome.");
    assert.equal(exception.value, "Paused");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
