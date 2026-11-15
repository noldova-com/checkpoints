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
import { RestoreStepException } from "../../src/exceptions/restore-step.exception.ts";

describe("RestorePathInTheWayException", { concurrency: true }, () => {
  it("names the path something already has where the restore writes", () => {
    const error = new RestorePathInTheWayException("a.txt");

    assert.equal(error.name, "RestorePathInTheWayException");
    assert.equal(error.message, "The restore couldn't change a.txt: something already has its name where the restore writes");
    assert.equal(error.path, "a.txt");
    assert.equal(error.cause, undefined);
    assert.ok(error instanceof RestoreStepException);
    assert.ok(error instanceof CheckpointsException);
  });
});
