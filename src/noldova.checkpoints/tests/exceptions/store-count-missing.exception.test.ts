/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CheckpointsException, StoreException } from "../../src/api/index.ts";
import { StoreCountMissingException } from "../../src/exceptions/store-count-missing.exception.ts";

describe("StoreCountMissingException", { concurrency: true }, () => {
  it("names the count the store's object count didn't give", () => {
    const error = new StoreCountMissingException("size-pack");

    assert.equal(error.name, "StoreCountMissingException");
    assert.equal(error.message, "The checkpoints store's object count gave no size-pack.");
    assert.equal(error.count, "size-pack");
    assert.equal(error.cause, undefined);
    assert.ok(error instanceof StoreException);
    assert.ok(error instanceof CheckpointsException);
  });
});
