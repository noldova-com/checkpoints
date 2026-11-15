/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InvalidBase64Exception } from "@noldova/checkpoints.protocol";

import { Base64 } from "../../src/services/base64.ts";

describe("Base64", { concurrency: true }, () => {
  it("writes bytes as Node writes base64, padded, for every length's remainder", () => {
    for (const length of [0, 1, 2, 3, 4, 5, 256]) {
      const bytes = Uint8Array.from({ length }, (_, t) => (t * 37 + 255) % 256);
      assert.equal(Base64.encode(bytes), Buffer.from(bytes).toString("base64"));
    }
  });

  it("reads back what it writes, every byte included", () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, t) => t);

    for (const length of [0, 1, 2, 3, 256])
      assert.deepEqual(Base64.decode(Base64.encode(bytes.subarray(0, length))), bytes.slice(0, length));
  });

  it("refuses text that isn't padded base64", () => {
    for (const text of ["Y", "YQ", "YQ=", "YQD", "Y===", "YQ==YQ==", "YQ-_", " YQ=="])
      assert.throws(() => Base64.decode(text), new InvalidBase64Exception());
  });
});
