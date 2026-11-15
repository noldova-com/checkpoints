/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CheckpointsException, StoreException, StoreFileUnreadableException } from "../../src/api/index.ts";

describe("StoreFileUnreadableException", { concurrency: true }, () => {
  it("names the file and says why it can't be read, keeping the failure", () => {
    const cause = new SyntaxError("Unexpected end of JSON input");
    const error = new StoreFileUnreadableException("index", cause);

    assert.equal(error.name, "StoreFileUnreadableException");
    assert.equal(error.message, "The checkpoints store's index can't be read: Unexpected end of JSON input");
    assert.equal(error.file, "index");
    assert.equal(error.cause, cause);
    assert.ok(error instanceof StoreException);
    assert.ok(error instanceof CheckpointsException);
  });
});
