/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CheckpointsException, StoreException, StoreObjectMissingException } from "../../src/api/index.ts";

describe("StoreObjectMissingException", { concurrency: true }, () => {
  it("names the content the store lacks", () => {
    const error = new StoreObjectMissingException("4b825dc642cb6eb9a060e54bf8d69288fbee4904");

    assert.equal(error.name, "StoreObjectMissingException");
    assert.equal(error.message, "The checkpoints store has no file content 4b825dc642cb6eb9a060e54bf8d69288fbee4904.");
    assert.equal(error.objectId, "4b825dc642cb6eb9a060e54bf8d69288fbee4904");
    assert.equal(error.cause, undefined);
    assert.ok(error instanceof StoreException);
    assert.ok(error instanceof CheckpointsException);
  });
});
