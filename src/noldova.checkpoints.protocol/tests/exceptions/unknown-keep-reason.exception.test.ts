/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ProtocolException, UnknownKeepReasonException } from "@noldova/checkpoints.protocol";

describe("UnknownKeepReasonException", { concurrency: true }, () => {
  it("names the wire value that is no reason a restore keeps a path", () => {
    const exception = new UnknownKeepReasonException("Locked");

    assert.equal(exception.name, "UnknownKeepReasonException");
    assert.equal(exception.message, "\"Locked\" is not a known reason a restore keeps a path.");
    assert.equal(exception.value, "Locked");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
