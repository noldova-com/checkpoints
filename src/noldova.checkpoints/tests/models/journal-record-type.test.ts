/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { UnknownJournalRecordException } from "../../src/api/index.ts";
import { JournalRecordType } from "../../src/models/journal-record-type.ts";

describe("JournalRecordType", { concurrency: true }, () => {
  const types = [
    JournalRecordType.Applying, JournalRecordType.Aside, JournalRecordType.Begin, JournalRecordType.Cleaning, JournalRecordType.Created,
    JournalRecordType.Keeping, JournalRecordType.Made, JournalRecordType.Placed, JournalRecordType.Placing, JournalRecordType.Removing,
    JournalRecordType.Renamed, JournalRecordType.Returned, JournalRecordType.RollingBack
  ];

  it("writes each type as the text the journal holds, and reads it back", () => {
    assert.deepEqual(types.map(t => t.toJson()), [
      "Applying", "Aside", "Begin", "Cleaning", "Created", "Keeping", "Made", "Placed", "Placing", "Removing", "Renamed", "Returned", "RollingBack"
    ]);
    for (const type of types)
      assert.equal(JournalRecordType.fromJson(type.toJson()), type);
  });

  it("refuses a text that names no type", () => {
    assert.throws(() => JournalRecordType.fromJson("Paused"), new UnknownJournalRecordException("Paused"));
    assert.throws(() => JournalRecordType.fromJson("aside"), new UnknownJournalRecordException("aside"));
  });
});
