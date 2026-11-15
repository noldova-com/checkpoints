/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InvalidTimeException, ProtocolException } from "@noldova/checkpoints.protocol";

describe("InvalidTimeException", { concurrency: true }, () => {
  it("names the time it refuses", () => {
    const exception = new InvalidTimeException("2026-10-18T12:00:00Z");

    assert.equal(exception.name, "InvalidTimeException");
    assert.equal(exception.message, "\"2026-10-18T12:00:00Z\" is not a time in UTC with milliseconds, such as 2026-10-18T12:00:00.000Z.");
    assert.equal(exception.time, "2026-10-18T12:00:00Z");
    assert.equal(exception.cause, undefined);
    assert.ok(exception instanceof ProtocolException);
  });
});
