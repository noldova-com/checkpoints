/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ProtocolException, UnknownRestoreOutcomeException } from "@noldova/checkpoints.protocol";

describe("UnknownRestoreOutcomeException", { concurrency: true }, () => {
  it("names the wire value that is no restore outcome", () => {
    const exception = new UnknownRestoreOutcomeException("Planned");

    assert.equal(exception.name, "UnknownRestoreOutcomeException");
    assert.equal(exception.message, "\"Planned\" is not a known restore outcome.");
    assert.equal(exception.value, "Planned");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
