/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CheckpointsException, StoreException } from "../../src/api/index.ts";
import { StoreAnswersMismatchException } from "../../src/exceptions/store-answers-mismatch.exception.ts";

describe("StoreAnswersMismatchException", { concurrency: true }, () => {
  it("names how many names were asked and how many answers came", () => {
    const error = new StoreAnswersMismatchException(2, 1);

    assert.equal(error.name, "StoreAnswersMismatchException");
    assert.equal(error.message, "The checkpoints store gave 1 answers to 2 names.");
    assert.deepEqual([error.asked, error.answered], [2, 1]);
    assert.equal(error.cause, undefined);
    assert.ok(error instanceof StoreException);
    assert.ok(error instanceof CheckpointsException);
  });
});
