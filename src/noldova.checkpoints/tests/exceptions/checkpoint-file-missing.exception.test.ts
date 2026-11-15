/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CheckpointFileMissingException, CheckpointsException, StoreException } from "../../src/api/index.ts";

describe("CheckpointFileMissingException", { concurrency: true }, () => {
  it("names the commit that holds no checkpoint.json", () => {
    const error = new CheckpointFileMissingException("4b825dc642cb6eb9a060e54bf8d69288fbee4904");

    assert.equal(error.name, "CheckpointFileMissingException");
    assert.equal(error.message, "The checkpoints store's checkpoint.json can't be read: the checkpoint at commit 4b825dc642cb6eb9a060e54bf8d69288fbee4904 has none.");
    assert.equal(error.commit, "4b825dc642cb6eb9a060e54bf8d69288fbee4904");
    assert.equal(error.cause, undefined);
    assert.ok(error instanceof StoreException);
    assert.ok(error instanceof CheckpointsException);
  });
});
