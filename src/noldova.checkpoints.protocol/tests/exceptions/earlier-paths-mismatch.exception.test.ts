/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { EarlierPathsMismatchException, ProtocolException } from "@noldova/checkpoints.protocol";

describe("EarlierPathsMismatchException", { concurrency: true }, () => {
  it("names the earlier path no step writes, or that is named twice", () => {
    const exception = new EarlierPathsMismatchException("src/a.txt");

    assert.equal(exception.name, "EarlierPathsMismatchException");
    assert.equal(exception.message, "A restore plan names each of its earlier paths once, and only a path one of its steps writes; \"src/a.txt\" is not.");
    assert.equal(exception.path, "src/a.txt");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
