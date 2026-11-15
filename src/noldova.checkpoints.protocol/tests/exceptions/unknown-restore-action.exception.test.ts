/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ProtocolException, UnknownRestoreActionException } from "@noldova/checkpoints.protocol";

describe("UnknownRestoreActionException", { concurrency: true }, () => {
  it("names the wire value that is no restore action", () => {
    const exception = new UnknownRestoreActionException("Move");

    assert.equal(exception.name, "UnknownRestoreActionException");
    assert.equal(exception.message, "\"Move\" is not a known restore action.");
    assert.equal(exception.value, "Move");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
