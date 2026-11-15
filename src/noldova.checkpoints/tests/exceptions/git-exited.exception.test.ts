/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CheckpointsException, GitException, GitExitedException } from "../../src/api/index.ts";

describe("GitExitedException", { concurrency: true }, () => {
  it("keeps the command, its exit code and its errors, and says them", () => {
    const error = new GitExitedException("fast-import", 128, "fatal: broken stream\n");

    assert.equal(error.name, "GitExitedException");
    assert.equal(error.message, "Git's fast-import failed with exit code 128: fatal: broken stream");
    assert.equal(error.command, "fast-import");
    assert.equal(error.exitCode, 128);
    assert.equal(error.errors, "fatal: broken stream\n");
    assert.equal(error.cause, undefined);
    assert.ok(error instanceof GitException);
    assert.ok(error instanceof CheckpointsException);
  });
});
