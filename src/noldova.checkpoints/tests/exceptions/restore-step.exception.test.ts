/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CheckpointsException } from "../../src/api/index.ts";
import { RestorePathInTheWayException } from "../../src/exceptions/restore-path-in-the-way.exception.ts";
import { RestoreStepFailedException } from "../../src/exceptions/restore-step-failed.exception.ts";
import { RestoreStepException } from "../../src/exceptions/restore-step.exception.ts";
import { StagedFileMissingException } from "../../src/exceptions/staged-file-missing.exception.ts";

describe("RestoreStepException", { concurrency: true }, () => {
  it("is the base of a restore step's failures, each keeping its path", () => {
    const errors = [
      new RestorePathInTheWayException("a.txt"),
      new RestoreStepFailedException("a.txt", new Error("EBUSY")),
      new StagedFileMissingException("a.txt")
    ];

    assert.deepEqual(errors.map(t => t.name), ["RestorePathInTheWayException", "RestoreStepFailedException", "StagedFileMissingException"]);
    assert.ok(errors.every(t => t instanceof RestoreStepException && t instanceof CheckpointsException && t instanceof Error));
    assert.ok(errors.every(t => t.path === "a.txt"));
  });
});
