/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { NotAnObjectException, ProtocolException } from "@noldova/checkpoints.protocol";

describe("NotAnObjectException", { concurrency: true }, () => {
  it("names the model that isn't an object", () => {
    const exception = new NotAnObjectException("Model");

    assert.equal(exception.name, "NotAnObjectException");
    assert.equal(exception.message, "Model must be a JSON object.");
    assert.equal(exception.model, "Model");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
