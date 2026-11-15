/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InvalidSizeException } from "@noldova/checkpoints.protocol";

import { ByteSize } from "../../src/services/byte-size.ts";

describe("ByteSize", { concurrency: true }, () => {
  it("takes a whole number of bytes, 0 or more", () => {
    for (const size of [0, 1, Number.MAX_SAFE_INTEGER])
      assert.doesNotThrow(() => ByteSize.check(size));
  });

  it("refuses a negative, fractional, unsafe or non-finite size", () => {
    for (const size of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN, Number.POSITIVE_INFINITY])
      assert.throws(() => ByteSize.check(size), new InvalidSizeException(size));
  });
});
