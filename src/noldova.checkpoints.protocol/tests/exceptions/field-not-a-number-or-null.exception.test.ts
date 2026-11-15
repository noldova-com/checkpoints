/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FieldNotANumberOrNullException, ProtocolException } from "@noldova/checkpoints.protocol";

describe("FieldNotANumberOrNullException", { concurrency: true }, () => {
  it("names the model and the field that is neither a number nor null", () => {
    const exception = new FieldNotANumberOrNullException("Model", "text");

    assert.equal(exception.name, "FieldNotANumberOrNullException");
    assert.equal(exception.message, "Model.text must be a number or null.");
    assert.equal(exception.model, "Model");
    assert.equal(exception.field, "text");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
