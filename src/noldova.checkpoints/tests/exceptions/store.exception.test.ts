/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CheckpointsException, ScriptStepMissingException, StoreException, StoreFileUnreadableException, UnsupportedStoreFormatException } from "../../src/api/index.ts";

describe("StoreException", { concurrency: true }, () => {
  it("is the base of a store file's failures, and a checkpoints exception", () => {
    const errors = [
      new UnsupportedStoreFormatException("2"),
      new StoreFileUnreadableException("index", new SyntaxError("Unexpected end of JSON input")),
      new ScriptStepMissingException(3)
    ];

    assert.deepEqual(errors.map(t => t.name), ["UnsupportedStoreFormatException", "StoreFileUnreadableException", "ScriptStepMissingException"]);
    assert.ok(errors.every(t => t instanceof StoreException && t instanceof CheckpointsException && t instanceof Error));
  });
});
