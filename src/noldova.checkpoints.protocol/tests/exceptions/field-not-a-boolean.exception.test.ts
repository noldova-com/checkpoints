/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FieldNotABooleanException, ProtocolException } from "@noldova/checkpoints.protocol";

describe("FieldNotABooleanException", { concurrency: true }, () => {
  it("names the model and the field that isn't true or false", () => {
    const exception = new FieldNotABooleanException("Model", "number");

    assert.equal(exception.name, "FieldNotABooleanException");
    assert.equal(exception.message, "Model.number must be true or false.");
    assert.equal(exception.model, "Model");
    assert.equal(exception.field, "number");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
