/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FieldNotAListException, ProtocolException } from "@noldova/checkpoints.protocol";

describe("FieldNotAListException", { concurrency: true }, () => {
  it("names the model and the field that isn't a list", () => {
    const exception = new FieldNotAListException("Model", "number");

    assert.equal(exception.name, "FieldNotAListException");
    assert.equal(exception.message, "Model.number must be a list.");
    assert.equal(exception.model, "Model");
    assert.equal(exception.field, "number");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
