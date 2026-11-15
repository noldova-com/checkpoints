/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CheckpointsException, StoreException, UnknownGitModeException } from "../../src/api/index.ts";

describe("UnknownGitModeException", { concurrency: true }, () => {
  it("names the mode the module doesn't write", () => {
    const error = new UnknownGitModeException("160000");

    assert.equal(error.name, "UnknownGitModeException");
    assert.equal(error.message, "The checkpoints store's files/ tree can't be read: 160000 is not a mode the module writes.");
    assert.equal(error.mode, "160000");
    assert.equal(error.cause, undefined);
    assert.ok(error instanceof StoreException);
    assert.ok(error instanceof CheckpointsException);
  });
});
