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
import { TreeLineMalformedException } from "../../src/exceptions/tree-line-malformed.exception.ts";

describe("TreeLineMalformedException", { concurrency: true }, () => {
  it("names the tree line the store gave that it can't read", () => {
    const error = new TreeLineMalformedException(":000000");

    assert.equal(error.name, "TreeLineMalformedException");
    assert.equal(error.message, "The checkpoints store listed a tree line it can't read: :000000.");
    assert.equal(error.line, ":000000");
    assert.equal(error.cause, undefined);
    assert.ok(error instanceof StoreException);
    assert.ok(error instanceof CheckpointsException);
  });
});
