/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InvalidCheckpointIdException, ProtocolException } from "@noldova/checkpoints.protocol";

describe("InvalidCheckpointIdException", { concurrency: true }, () => {
  it("names the id it refuses", () => {
    const exception = new InvalidCheckpointIdException("a");

    assert.equal(exception.name, "InvalidCheckpointIdException");
    assert.equal(exception.message, "\"a\" is not a checkpoint ID: a lowercase UUID version 7.");
    assert.equal(exception.id, "a");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
