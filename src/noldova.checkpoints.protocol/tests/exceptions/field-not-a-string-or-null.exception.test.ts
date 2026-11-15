/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FieldNotAStringOrNullException, ProtocolException } from "@noldova/checkpoints.protocol";

describe("FieldNotAStringOrNullException", { concurrency: true }, () => {
  it("names the model and the field that is neither text nor null", () => {
    const exception = new FieldNotAStringOrNullException("Model", "number");

    assert.equal(exception.name, "FieldNotAStringOrNullException");
    assert.equal(exception.message, "Model.number must be a string or null.");
    assert.equal(exception.model, "Model");
    assert.equal(exception.field, "number");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
