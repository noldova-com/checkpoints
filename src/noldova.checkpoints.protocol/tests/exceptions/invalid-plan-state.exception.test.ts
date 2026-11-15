/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InvalidPlanStateException, ProtocolException } from "@noldova/checkpoints.protocol";

describe("InvalidPlanStateException", { concurrency: true }, () => {
  it("names the state it refuses", () => {
    const exception = new InvalidPlanStateException("x");

    assert.equal(exception.name, "InvalidPlanStateException");
    assert.equal(exception.message, "\"x\" is not a plan's state: a lowercase SHA-256 in hexadecimal.");
    assert.equal(exception.state, "x");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
