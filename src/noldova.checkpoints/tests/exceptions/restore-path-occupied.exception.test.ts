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
import { RestorePathOccupiedException } from "../../src/exceptions/restore-path-occupied.exception.ts";
import { RestoreStepException } from "../../src/exceptions/restore-step.exception.ts";

describe("RestorePathOccupiedException", { concurrency: true }, () => {
  it("names the path something now has, so its item can't go back", () => {
    const error = new RestorePathOccupiedException("a.txt");

    assert.equal(error.name, "RestorePathOccupiedException");
    assert.equal(error.message, "The restore couldn't change a.txt: something now has its name, so what the restore moved aside can't go back");
    assert.equal(error.path, "a.txt");
    assert.equal(error.cause, undefined);
    assert.ok(error instanceof RestoreStepException);
    assert.ok(error instanceof CheckpointsException);
  });
});
