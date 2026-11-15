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
import { RestorePathChangedException } from "../../src/exceptions/restore-path-changed.exception.ts";
import { RestoreStepException } from "../../src/exceptions/restore-step.exception.ts";

describe("RestorePathChangedException", { concurrency: true }, () => {
  it("names the path another program changed", () => {
    const error = new RestorePathChangedException("a.txt");

    assert.equal(error.name, "RestorePathChangedException");
    assert.equal(error.message, "The restore couldn't change a.txt: another program changed it after the checkpoint taken before the restore");
    assert.equal(error.path, "a.txt");
    assert.equal(error.cause, undefined);
    assert.ok(error instanceof RestoreStepException);
    assert.ok(error instanceof CheckpointsException);
  });
});
