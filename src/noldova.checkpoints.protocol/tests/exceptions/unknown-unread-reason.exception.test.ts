/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ProtocolException, UnknownUnreadReasonException } from "@noldova/checkpoints.protocol";

describe("UnknownUnreadReasonException", { concurrency: true }, () => {
  it("names the wire value that is no reason for a path that couldn't be read", () => {
    const exception = new UnknownUnreadReasonException("Locked");

    assert.equal(exception.name, "UnknownUnreadReasonException");
    assert.equal(exception.message, "\"Locked\" is not a known reason for a path that couldn't be read.");
    assert.equal(exception.value, "Locked");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
