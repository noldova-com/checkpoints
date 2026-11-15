/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ExceptionOptions } from "@noldova/context.exceptions";

import { CheckpointsException, GitException, GitExitedException, GitStoppedException } from "../../src/api/index.ts";

class CausedGitException extends GitException {
  public override readonly command: string = "cat-file";
  public override readonly errors: string = "fatal: for the test";

  public constructor(cause: Error) {
    super("Git failed for the test", new ExceptionOptions(cause));
  }
}

describe("GitException", { concurrency: true }, () => {
  it("is the base of a Git command's failures, whichever way it ended", () => {
    const errors = [
      new GitExitedException("fast-import", 128, ""),
      new GitStoppedException("cat-file", "")
    ];

    assert.deepEqual(errors.map(t => t.name), ["GitExitedException", "GitStoppedException"]);
    assert.ok(errors.every(t => t instanceof GitException && t instanceof CheckpointsException && t instanceof Error));
  });

  it("keeps the failure that caused it beside the command's facts", () => {
    const cause = new Error("EPIPE for the test");
    const error = new CausedGitException(cause);

    assert.deepEqual([error.message, error.command, error.errors, error.cause], ["Git failed for the test", "cat-file", "fatal: for the test", cause]);
  });
});
