/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ProtocolException, UnknownChangeStatusException } from "@noldova/checkpoints.protocol";

describe("UnknownChangeStatusException", { concurrency: true }, () => {
  it("names the wire value that is no change status", () => {
    const exception = new UnknownChangeStatusException("Renamed");

    assert.equal(exception.name, "UnknownChangeStatusException");
    assert.equal(exception.message, "\"Renamed\" is not a known change status.");
    assert.equal(exception.value, "Renamed");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
