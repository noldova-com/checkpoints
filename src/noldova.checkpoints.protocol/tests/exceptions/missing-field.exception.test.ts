/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MissingFieldException, ProtocolException } from "@noldova/checkpoints.protocol";

describe("MissingFieldException", { concurrency: true }, () => {
  it("names the model and the missing field", () => {
    const exception = new MissingFieldException("Model", "missing");

    assert.equal(exception.name, "MissingFieldException");
    assert.equal(exception.message, "Model.missing is missing.");
    assert.equal(exception.model, "Model");
    assert.equal(exception.field, "missing");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
