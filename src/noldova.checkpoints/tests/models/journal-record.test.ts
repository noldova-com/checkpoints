/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { JournalFieldMissingException, UnknownJournalRecordException } from "../../src/api/index.ts";
import { JournalRecordType } from "../../src/models/journal-record-type.ts";
import { JournalRecord } from "../../src/models/journal-record.ts";
import { RestoreScript } from "../../src/models/restore-script.ts";

describe("JournalRecord", { concurrency: true }, () => {
  const script = new RestoreScript("r1", "01890a5d-ac96-774b-bcce-b302099a8057", "01890a5d-ac96-774b-bcce-b302099a8058", [], [], [], new Map());

  it("writes and reads each kind of record", () => {
    const records = [
      JournalRecord.begin(script),
      JournalRecord.Applying,
      JournalRecord.ofStep(JournalRecordType.Aside, 3),
      JournalRecord.ofPath(JournalRecordType.Created, "dir"),
      JournalRecord.renamed("docs", "Docs"),
      JournalRecord.ofFile(JournalRecordType.Placing, 4, "1:9"),
      JournalRecord.ofFile(JournalRecordType.Placed, 4, "1:10"),
      JournalRecord.ofPath(JournalRecordType.Removing, "gone"),
      JournalRecord.Cleaning,
      JournalRecord.keeping("01890a5d-ac96-774b-bcce-b302099a8059"),
      JournalRecord.RollingBack,
      JournalRecord.ofPath(JournalRecordType.Made, "gone"),
      JournalRecord.ofFile(JournalRecordType.Made, 5, "1:11"),
      JournalRecord.ofFile(JournalRecordType.Returned, 6, "1:12")
    ];

    for (const record of records)
      assert.deepEqual(JournalRecord.fromJson(JSON.parse(JSON.stringify(record.toJson()))).toJson(), record.toJson());
    assert.deepEqual(JournalRecord.renamed("docs", "Docs").toJson(), { type: "Renamed", script: null, step: null, path: "docs", from: "Docs", fileId: null, checkpoint: null });
    assert.equal(JournalRecord.keeping("01890a5d-ac96-774b-bcce-b302099a8059").toJson()["checkpoint"], "01890a5d-ac96-774b-bcce-b302099a8059");
  });

  it("names the same action by its type and its step or path, whatever its file id", () => {
    assert.ok(JournalRecord.ofFile(JournalRecordType.Placing, 4, "1:9").isSameAs(JournalRecord.ofStep(JournalRecordType.Placing, 4)));
    assert.ok(!JournalRecord.ofStep(JournalRecordType.Placing, 4).isSameAs(JournalRecord.ofStep(JournalRecordType.Aside, 4)));
    assert.ok(!JournalRecord.ofPath(JournalRecordType.Created, "a").isSameAs(JournalRecord.ofPath(JournalRecordType.Created, "b")));
  });

  it("reads the fields a record of its type holds, and fails naming one it lacks", () => {
    const renamed = JournalRecord.renamed("docs", "Docs");
    const aside = JournalRecord.ofStep(JournalRecordType.Aside, 3);
    const keeping = JournalRecord.keeping("01890a5d-ac96-774b-bcce-b302099a8059");

    assert.deepEqual([renamed.readPath(), renamed.readFrom(), aside.readStep(), keeping.readCheckpoint()], ["docs", "Docs", 3, "01890a5d-ac96-774b-bcce-b302099a8059"]);
    assert.throws(() => aside.readPath(), new JournalFieldMissingException("JournalRecord", "path"));
    assert.throws(() => aside.readFrom(), new JournalFieldMissingException("JournalRecord", "from"));
    assert.throws(() => renamed.readStep(), new JournalFieldMissingException("JournalRecord", "step"));
    assert.throws(() => renamed.readCheckpoint(), new JournalFieldMissingException("JournalRecord", "checkpoint"));
  });

  it("refuses a record of a type it doesn't know", () => {
    assert.throws(() => JournalRecord.fromJson({ ...JournalRecord.Applying.toJson(), type: "Kept" }), new UnknownJournalRecordException("Kept"));
  });
});
