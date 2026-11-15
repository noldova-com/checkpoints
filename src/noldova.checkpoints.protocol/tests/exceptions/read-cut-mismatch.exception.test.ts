/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ProtocolException, ReadCutMismatchException } from "@noldova/checkpoints.protocol";

describe("ReadCutMismatchException", { concurrency: true }, () => {
  it("names what the wire form says of the cut", () => {
    const exception = new ReadCutMismatchException(true);

    assert.equal(exception.name, "ReadCutMismatchException");
    assert.equal(exception.message, "A read result is cut exactly when its content is shorter than its size; it says isCut is true.");
    assert.equal(exception.isCut, true);
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
