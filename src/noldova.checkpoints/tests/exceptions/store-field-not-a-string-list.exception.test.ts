/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CheckpointsException, StoreException, StoreFieldNotAStringListException } from "../../src/api/index.ts";

describe("StoreFieldNotAStringListException", { concurrency: true }, () => {
  it("names the field that holds something other than text", () => {
    const error = new StoreFieldNotAStringListException("emptyFolders");

    assert.equal(error.name, "StoreFieldNotAStringListException");
    assert.equal(error.message, "emptyFolders holds something other than text.");
    assert.equal(error.field, "emptyFolders");
    assert.equal(error.cause, undefined);
    assert.ok(error instanceof StoreException);
    assert.ok(error instanceof CheckpointsException);
  });
});
