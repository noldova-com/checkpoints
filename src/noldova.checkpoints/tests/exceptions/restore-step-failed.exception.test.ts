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
import { RestoreStepFailedException } from "../../src/exceptions/restore-step-failed.exception.ts";
import { RestoreStepException } from "../../src/exceptions/restore-step.exception.ts";

describe("RestoreStepFailedException", { concurrency: true }, () => {
  it("names the path and says why its change failed, keeping the failure", () => {
    const cause = new Error("EBUSY: resource busy or locked");
    const error = new RestoreStepFailedException("a.txt", cause);

    assert.equal(error.name, "RestoreStepFailedException");
    assert.equal(error.message, "The restore couldn't change a.txt: EBUSY: resource busy or locked");
    assert.equal(error.path, "a.txt");
    assert.equal(error.cause, cause);
    assert.ok(error instanceof RestoreStepException);
    assert.ok(error instanceof CheckpointsException);
  });
});
