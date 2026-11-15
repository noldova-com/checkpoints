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
import { RestoreStepException } from "../../src/exceptions/restore-step.exception.ts";
import { StagedFileMissingException } from "../../src/exceptions/staged-file-missing.exception.ts";

describe("StagedFileMissingException", { concurrency: true }, () => {
  it("names the path whose staged file is missing", () => {
    const error = new StagedFileMissingException("a.txt");

    assert.equal(error.name, "StagedFileMissingException");
    assert.equal(error.message, "The restore couldn't change a.txt: its staged file is missing");
    assert.equal(error.path, "a.txt");
    assert.equal(error.cause, undefined);
    assert.ok(error instanceof RestoreStepException);
    assert.ok(error instanceof CheckpointsException);
  });
});
