/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ContentTooLongException, ProtocolException } from "@noldova/checkpoints.protocol";

describe("ContentTooLongException", { concurrency: true }, () => {
  it("names the content's length and the size it is longer than", () => {
    const exception = new ContentTooLongException(3, 2);

    assert.equal(exception.name, "ContentTooLongException");
    assert.equal(exception.message, "A read result's content of 3 bytes is longer than its size, 2.");
    assert.equal(exception.length, 3);
    assert.equal(exception.size, 2);
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
