/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InvalidIdentityException, ProtocolException } from "@noldova/checkpoints.protocol";

describe("InvalidIdentityException", { concurrency: true }, () => {
  it("keeps the identity it refuses", () => {
    const exception = new InvalidIdentityException("project 1");

    assert.equal(exception.name, "InvalidIdentityException");
    assert.equal(exception.message, "A folder's identity must be 1 to 64 lower-case letters, digits or hyphens, so it names one store on every file system.");
    assert.equal(exception.identity, "project 1");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
