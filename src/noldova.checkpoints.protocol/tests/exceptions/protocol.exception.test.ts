/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Exception } from "@noldova/context.exceptions";

import { InvalidIdentityException, ProtocolException } from "@noldova/checkpoints.protocol";

describe("ProtocolException", { concurrency: true }, () => {
  it("is the base of the protocol's exceptions, each named for its own class", () => {
    const exception = new InvalidIdentityException("");

    assert.ok(exception instanceof ProtocolException);
    assert.ok(exception instanceof Exception);
    assert.ok(exception instanceof Error);
    assert.equal(exception.name, "InvalidIdentityException");
  });
});
