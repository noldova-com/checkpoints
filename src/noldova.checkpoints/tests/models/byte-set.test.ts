/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ByteSet } from "../../src/models/byte-set.ts";

describe("ByteSet", { concurrency: true }, () => {
  it("writes one byte, and each run of bytes as a range", () => {
    assert.equal(ByteSet.of(t => t === 0x61).toExpression(), "[\\x61]");
    assert.equal(ByteSet.of(t => t >= 0x61 && t <= 0x63 || t === 0xff).toExpression(), "[\\x61-\\x63\\xff]");
  });

  it("never holds the byte 0, which no name holds", () => {
    assert.equal(ByteSet.of(() => true).toExpression(), "[\\x01-\\xff]");
  });

  it("writes a set with no bytes as an expression that matches nothing", () => {
    assert.equal(ByteSet.of(() => false).toExpression(), "(?!)");
    assert.equal(new RegExp(`^${ByteSet.of(() => false).toExpression()}$`).test("a"), false);
  });
});
