/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FieldNotANumberException, ProtocolException } from "@noldova/checkpoints.protocol";

describe("FieldNotANumberException", { concurrency: true }, () => {
  it("names the model and the field that isn't a number", () => {
    const exception = new FieldNotANumberException("Model", "text");

    assert.equal(exception.name, "FieldNotANumberException");
    assert.equal(exception.message, "Model.text must be a number.");
    assert.equal(exception.model, "Model");
    assert.equal(exception.field, "text");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
