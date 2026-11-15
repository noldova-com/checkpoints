/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InvalidSizeException, ProtocolException } from "@noldova/checkpoints.protocol";

describe("InvalidSizeException", { concurrency: true }, () => {
  it("names the size it refuses", () => {
    const exception = new InvalidSizeException(-1);

    assert.equal(exception.name, "InvalidSizeException");
    assert.equal(exception.message, "A size is a whole number of bytes, 0 or more; this one is -1.");
    assert.equal(exception.size, -1);
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
