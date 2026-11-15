/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ProtocolException, UnknownPreviewOutcomeException } from "@noldova/checkpoints.protocol";

describe("UnknownPreviewOutcomeException", { concurrency: true }, () => {
  it("names the wire value that is no preview outcome", () => {
    const exception = new UnknownPreviewOutcomeException("Compared");

    assert.equal(exception.name, "UnknownPreviewOutcomeException");
    assert.equal(exception.message, "\"Compared\" is not a known preview outcome.");
    assert.equal(exception.value, "Compared");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
