/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ProtocolException, UnknownCaptureModeException } from "@noldova/checkpoints.protocol";

describe("UnknownCaptureModeException", { concurrency: true }, () => {
  it("names the wire value that is no capture mode", () => {
    const exception = new UnknownCaptureModeException("everyFile");

    assert.equal(exception.name, "UnknownCaptureModeException");
    assert.equal(exception.message, "\"everyFile\" is not a known capture mode.");
    assert.equal(exception.value, "everyFile");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
