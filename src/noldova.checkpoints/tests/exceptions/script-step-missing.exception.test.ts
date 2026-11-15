/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CheckpointsException, ScriptStepMissingException, StoreException } from "../../src/api/index.ts";

describe("ScriptStepMissingException", { concurrency: true }, () => {
  it("names the step the script doesn't hold", () => {
    const error = new ScriptStepMissingException(3);

    assert.equal(error.name, "ScriptStepMissingException");
    assert.equal(error.message, "The checkpoints store's restore.json can't be read: its script has no step 3.");
    assert.equal(error.step, 3);
    assert.equal(error.cause, undefined);
    assert.ok(error instanceof StoreException);
    assert.ok(error instanceof CheckpointsException);
  });
});
