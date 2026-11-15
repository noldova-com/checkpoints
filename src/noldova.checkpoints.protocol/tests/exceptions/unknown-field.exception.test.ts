/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ProtocolException, UnknownFieldException } from "@noldova/checkpoints.protocol";

describe("UnknownFieldException", { concurrency: true }, () => {
  it("names the model and the field it doesn't know", () => {
    const exception = new UnknownFieldException("Model", "other");

    assert.equal(exception.name, "UnknownFieldException");
    assert.equal(exception.message, "Model.other is not a known field.");
    assert.equal(exception.model, "Model");
    assert.equal(exception.field, "other");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
