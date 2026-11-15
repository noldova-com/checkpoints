/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ProtocolException, UnknownDeleteFolderOutcomeException } from "@noldova/checkpoints.protocol";

describe("UnknownDeleteFolderOutcomeException", { concurrency: true }, () => {
  it("names the wire value that is no delete outcome", () => {
    const exception = new UnknownDeleteFolderOutcomeException("Missing");

    assert.equal(exception.name, "UnknownDeleteFolderOutcomeException");
    assert.equal(exception.message, "\"Missing\" is not a known delete outcome.");
    assert.equal(exception.value, "Missing");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
