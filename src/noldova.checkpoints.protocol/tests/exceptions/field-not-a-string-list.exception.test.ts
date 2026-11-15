/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FieldNotAStringListException, ProtocolException } from "@noldova/checkpoints.protocol";

describe("FieldNotAStringListException", { concurrency: true }, () => {
  it("names the model and the field that isn't a list of text", () => {
    const exception = new FieldNotAStringListException("Model", "mixed");

    assert.equal(exception.name, "FieldNotAStringListException");
    assert.equal(exception.message, "Model.mixed must be a list of strings.");
    assert.equal(exception.model, "Model");
    assert.equal(exception.field, "mixed");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
