/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CheckpointsException, JournalFieldMissingException, StoreException } from "../../src/api/index.ts";

describe("JournalFieldMissingException", { concurrency: true }, () => {
  it("names the record and the field it lacks", () => {
    const error = new JournalFieldMissingException("JournalRecord", "path");

    assert.equal(error.name, "JournalFieldMissingException");
    assert.equal(error.message, "The checkpoints store's restore.json can't be read: its JournalRecord has no path.");
    assert.equal(error.model, "JournalRecord");
    assert.equal(error.field, "path");
    assert.equal(error.cause, undefined);
    assert.ok(error instanceof StoreException);
    assert.ok(error instanceof CheckpointsException);
  });
});
