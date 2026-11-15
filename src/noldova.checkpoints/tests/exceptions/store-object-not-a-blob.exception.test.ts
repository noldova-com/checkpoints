/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CheckpointsException, StoreException, StoreObjectNotABlobException } from "../../src/api/index.ts";

describe("StoreObjectNotABlobException", { concurrency: true }, () => {
  it("names the object the store gave as something other than file content, and the header it gave", () => {
    const error = new StoreObjectNotABlobException("4b825dc642cb6eb9a060e54bf8d69288fbee4904", "4b825dc642cb6eb9a060e54bf8d69288fbee4904 tree 0");

    assert.equal(error.name, "StoreObjectNotABlobException");
    assert.equal(error.message, "The checkpoints store's 4b825dc642cb6eb9a060e54bf8d69288fbee4904 isn't file content: it gave 4b825dc642cb6eb9a060e54bf8d69288fbee4904 tree 0.");
    assert.equal(error.objectId, "4b825dc642cb6eb9a060e54bf8d69288fbee4904");
    assert.equal(error.header, "4b825dc642cb6eb9a060e54bf8d69288fbee4904 tree 0");
    assert.equal(error.cause, undefined);
    assert.ok(error instanceof StoreException);
    assert.ok(error instanceof CheckpointsException);
  });
});
