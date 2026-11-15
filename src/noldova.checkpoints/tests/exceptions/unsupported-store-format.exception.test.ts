/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CheckpointsException, StoreException, UnsupportedStoreFormatException } from "../../src/api/index.ts";

describe("UnsupportedStoreFormatException", { concurrency: true }, () => {
  it("names the format version it doesn't read", () => {
    const error = new UnsupportedStoreFormatException("2");

    assert.equal(error.name, "UnsupportedStoreFormatException");
    assert.equal(error.message, "its format version is 2, which this version of the module doesn't read.");
    assert.equal(error.version, "2");
    assert.equal(error.cause, undefined);
    assert.ok(error instanceof StoreException);
    assert.ok(error instanceof CheckpointsException);
  });
});
