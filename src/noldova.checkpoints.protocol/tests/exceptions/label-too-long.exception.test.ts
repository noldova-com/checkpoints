/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { LabelTooLongException, ProtocolException } from "@noldova/checkpoints.protocol";

describe("LabelTooLongException", { concurrency: true }, () => {
  it("names the length of the label it refuses", () => {
    const exception = new LabelTooLongException(1_025);

    assert.equal(exception.name, "LabelTooLongException");
    assert.equal(exception.message, "A label has at most 1024 characters; this one has 1025.");
    assert.equal(exception.length, 1_025);
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
