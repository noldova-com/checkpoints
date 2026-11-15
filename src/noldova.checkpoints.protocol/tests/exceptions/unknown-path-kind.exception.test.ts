/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ProtocolException, UnknownPathKindException } from "@noldova/checkpoints.protocol";

describe("UnknownPathKindException", { concurrency: true }, () => {
  it("names the wire value that is no kind of path", () => {
    const exception = new UnknownPathKindException("Socket");

    assert.equal(exception.name, "UnknownPathKindException");
    assert.equal(exception.message, "\"Socket\" is not a known kind of path.");
    assert.equal(exception.value, "Socket");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
