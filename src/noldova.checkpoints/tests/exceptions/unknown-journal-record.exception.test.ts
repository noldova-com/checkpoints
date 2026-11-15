/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CheckpointsException, StoreException, UnknownJournalRecordException } from "../../src/api/index.ts";

describe("UnknownJournalRecordException", { concurrency: true }, () => {
  it("names the record type it doesn't know", () => {
    const error = new UnknownJournalRecordException("Kept");

    assert.equal(error.name, "UnknownJournalRecordException");
    assert.equal(error.message, "\"Kept\" is not a known record of a restore's journal.");
    assert.equal(error.type, "Kept");
    assert.equal(error.cause, undefined);
    assert.ok(error instanceof StoreException);
    assert.ok(error instanceof CheckpointsException);
  });
});
