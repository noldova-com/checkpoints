/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { JournalReading } from "../../src/models/journal-reading.ts";
import { JournalRecord } from "../../src/models/journal-record.ts";
import { RestoreScript } from "../../src/models/restore-script.ts";

describe("JournalReading", { concurrency: true }, () => {
  const script = new RestoreScript("r1", "01890a5d-ac96-774b-bcce-b302099a8057", "01890a5d-ac96-774b-bcce-b302099a8058", [], [], [], new Map());

  it("gives the script of its first record, and a copy of its records", () => {
    const records = [JournalRecord.begin(script), JournalRecord.Applying];
    const reading = new JournalReading(records, true);
    records.pop();

    assert.deepEqual([reading.isReadable, reading.records.length, reading.script], [true, 2, script]);
  });

  it("gives no script when its first record has none, when it has no record, or when the journal can't be read", () => {
    assert.equal(new JournalReading([JournalRecord.Applying], true).script, null);
    assert.equal(new JournalReading([], true).script, null);
    assert.equal(new JournalReading([JournalRecord.begin(script)], false).script, null);
  });
});
