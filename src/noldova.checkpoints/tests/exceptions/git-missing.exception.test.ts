/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CheckpointsException, GitMissingException } from "../../src/api/index.ts";

describe("GitMissingException", { concurrency: true }, () => {
  it("names the missing package and keeps the failure that showed it", () => {
    const cause = new Error("Cannot find package");
    const error = new GitMissingException("@noldova/checkpoints.git.linux-x64", cause);

    assert.equal(error.name, "GitMissingException");
    assert.equal(error.message, "The Git build for this system, @noldova/checkpoints.git.linux-x64, isn't installed.");
    assert.equal(error.packageName, "@noldova/checkpoints.git.linux-x64");
    assert.equal(error.cause, cause);
    assert.ok(error instanceof CheckpointsException);
  });
});
