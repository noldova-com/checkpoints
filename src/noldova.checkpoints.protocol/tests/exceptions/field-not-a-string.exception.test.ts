/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FieldNotAStringException, ProtocolException } from "@noldova/checkpoints.protocol";

describe("FieldNotAStringException", { concurrency: true }, () => {
  it("names the model and the field that isn't text", () => {
    const exception = new FieldNotAStringException("Model", "number");

    assert.equal(exception.name, "FieldNotAStringException");
    assert.equal(exception.message, "Model.number must be a string.");
    assert.equal(exception.model, "Model");
    assert.equal(exception.field, "number");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
