/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CaptureMode } from "@noldova/checkpoints.protocol";

import { CheckpointsException, IgnoreRulesMismatchException, StoreException } from "../../src/api/index.ts";

describe("IgnoreRulesMismatchException", { concurrency: true }, () => {
  it("names the checkpoint's mode its ignore rules don't fit", () => {
    const error = new IgnoreRulesMismatchException(CaptureMode.EveryFile);

    assert.equal(error.name, "IgnoreRulesMismatchException");
    assert.equal(error.message, "its ignore rules don't fit its mode, EveryFile: a checkpoint has them only when it followed the ignore files.");
    assert.equal(error.mode, CaptureMode.EveryFile);
    assert.equal(error.cause, undefined);
    assert.ok(error instanceof StoreException);
    assert.ok(error instanceof CheckpointsException);
  });
});
