/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CheckpointsException, StoreException, UnexpectedStoreObjectException } from "../../src/api/index.ts";

describe("UnexpectedStoreObjectException", { concurrency: true }, () => {
  it("names the content no staged file asked for", () => {
    const error = new UnexpectedStoreObjectException("4b825dc642cb6eb9a060e54bf8d69288fbee4904 blob 5");

    assert.equal(error.name, "UnexpectedStoreObjectException");
    assert.equal(error.message, "The checkpoints store gave 4b825dc642cb6eb9a060e54bf8d69288fbee4904 blob 5, which no file asked for.");
    assert.equal(error.header, "4b825dc642cb6eb9a060e54bf8d69288fbee4904 blob 5");
    assert.equal(error.cause, undefined);
    assert.ok(error instanceof StoreException);
    assert.ok(error instanceof CheckpointsException);
  });
});
