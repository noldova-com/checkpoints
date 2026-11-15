/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InvalidReadLimitException, ProtocolException } from "@noldova/checkpoints.protocol";

describe("InvalidReadLimitException", { concurrency: true }, () => {
  it("names the limit it refuses", () => {
    const exception = new InvalidReadLimitException(0);

    assert.equal(exception.name, "InvalidReadLimitException");
    assert.equal(exception.message, "A read's limit is a whole number of bytes from 1 to 16777216; this one is 0.");
    assert.equal(exception.limit, 0);
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
