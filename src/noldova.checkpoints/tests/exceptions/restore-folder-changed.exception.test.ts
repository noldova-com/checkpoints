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
import { RestoreFolderChangedException } from "../../src/exceptions/restore-folder-changed.exception.ts";
import { RestoreStepException } from "../../src/exceptions/restore-step.exception.ts";

describe("RestoreFolderChangedException", { concurrency: true }, () => {
  it("names the path and the folder that changed under it", () => {
    const error = new RestoreFolderChangedException("a/b.txt", "a");

    assert.equal(error.name, "RestoreFolderChangedException");
    assert.equal(error.message, "The restore couldn't change a/b.txt: a isn't the folder the restore was planned on, or is now a link");
    assert.equal(error.path, "a/b.txt");
    assert.equal(error.folder, "a");
    assert.equal(error.cause, undefined);
    assert.ok(error instanceof RestoreStepException);
    assert.ok(error instanceof CheckpointsException);
  });
});
