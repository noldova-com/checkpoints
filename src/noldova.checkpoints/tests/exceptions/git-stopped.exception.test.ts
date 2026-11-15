/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CheckpointsException, GitException, GitStoppedException } from "../../src/api/index.ts";

describe("GitStoppedException", { concurrency: true }, () => {
  it("keeps the command and its errors, and says a signal stopped it", () => {
    const error = new GitStoppedException("cat-file", "");

    assert.equal(error.name, "GitStoppedException");
    assert.equal(error.message, "Git's cat-file failed, stopped by a signal: ");
    assert.equal(error.command, "cat-file");
    assert.equal(error.errors, "");
    assert.equal(error.cause, undefined);
    assert.ok(error instanceof GitException);
    assert.ok(error instanceof CheckpointsException);
  });
});
