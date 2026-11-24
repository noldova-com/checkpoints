/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { appendFile, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import "@noldova/context.core";

import { JournalRecordType } from "../../src/models/journal-record-type.ts";
import { JournalRecord } from "../../src/models/journal-record.ts";
import { RestoreScript } from "../../src/models/restore-script.ts";
import { RestoreJournal } from "../../src/services/restore-journal.ts";

describe("RestoreJournal", { concurrency: true }, () => {
  const script = new RestoreScript("r1", "01890a5d-ac96-774b-bcce-b302099a8057", "01890a5d-ac96-774b-bcce-b302099a8058", [], ["dir"], [], new Map([["", "1:2"]]));
  const journalAsync = async (t: TestContext): Promise<RestoreJournal> => {
    const folder = await mkdtemp(path.join(tmpdir(), "restore-journal-"));
    t.after(() => rm(folder, { recursive: true, force: true }));
    return new RestoreJournal(path.join(folder, "restore.json"));
  };

  it("creates the journal whole with its script, appends each record, and reads them back in order", async t => {
    const journal = await journalAsync(t);

    await journal.createAsync(script);
    await journal.appendAsync(JournalRecord.Applying);
    await journal.appendAsync(JournalRecord.ofPath(JournalRecordType.Created, "dir"));

    const expected = [JournalRecord.begin(script).toJson(), JournalRecord.Applying.toJson(), JournalRecord.ofPath(JournalRecordType.Created, "dir").toJson()];
    assert.deepEqual(journal.records.map(u => u.toJson()), expected);
    const reopened = new RestoreJournal(journal.file);
    const reading = await reopened.readAsync();
    assert.deepEqual([reading?.isReadable, reading?.records.map(u => u.toJson()), reading?.script?.restoreId], [true, expected, "r1"]);
    assert.deepEqual(reopened.records.map(u => u.toJson()), expected);
    assert.deepEqual(await readdir(path.dirname(journal.file)), ["restore.json"]);
  });

  it("lets through a failure to read the journal other than there being none", async () => {
    await assert.rejects(new RestoreJournal("a\0b").readAsync(), { code: "ERR_INVALID_ARG_VALUE" });
  });

  it("flushes a folder to disk through a handle it opens on it, so a folder that isn't there fails", async t => {
    const journal = await journalAsync(t);

    await RestoreJournal.syncFolderAsync(path.dirname(journal.file));
    await assert.rejects(RestoreJournal.syncFolderAsync(path.join(path.dirname(journal.file), "gone")), { code: "ENOENT" });
  });

  it("reads no journal where there is none, and removes one with its temporary file", async t => {
    const journal = await journalAsync(t);

    assert.equal(await journal.readAsync(), null);
    await journal.createAsync(script);
    await writeFile(`${journal.file}.tmp`, "left from a create");
    await journal.removeAsync();
    assert.equal(await journal.readAsync(), null);
    assert.deepEqual(await readdir(path.dirname(journal.file)), []);
  });

  it("ends what it reads at a torn record, even one that lacks only its line feed, which it cuts off so the next record follows the last whole one, or at one whose checksum doesn't match or that isn't a record", async t => {
    const journal = await journalAsync(t);
    await journal.createAsync(script);
    await journal.appendAsync(JournalRecord.Applying);
    const whole = await readFile(journal.file, "utf8");
    const [, second] = whole.split("\n");
    assert.ok(!Object.isUndefined(second));

    await appendFile(journal.file, second.slice(0, 20));
    assert.equal((await journal.readAsync())?.records.length, 2);
    assert.equal(await readFile(journal.file, "utf8"), whole);
    await journal.appendAsync(JournalRecord.Cleaning);
    assert.deepEqual((await journal.readAsync())?.records.map(t => t.type), [JournalRecordType.Begin, JournalRecordType.Applying, JournalRecordType.Cleaning]);

    await writeFile(journal.file, (await readFile(journal.file, "utf8")).slice(0, -1));
    assert.deepEqual((await journal.readAsync())?.records.map(t => t.type), [JournalRecordType.Begin, JournalRecordType.Applying]);
    assert.equal(await readFile(journal.file, "utf8"), whole);

    await writeFile(journal.file, whole.replace("Applying", "Cleaning"));
    assert.equal((await journal.readAsync())?.records.length, 1);

    await writeFile(journal.file, `${whole}not a record\n`);
    assert.equal((await journal.readAsync())?.records.length, 2);
    assert.equal(await readFile(journal.file, "utf8"), whole);
  });

  it("reads no record from a journal whose first line, or a line before its last, isn't a whole record, since only an append is torn and only at its end, and leaves it as it is", async t => {
    const journal = await journalAsync(t);
    await journal.createAsync(script);
    await journal.appendAsync(JournalRecord.Applying);
    const [first, second] = (await readFile(journal.file, "utf8")).split("\n");
    assert.ok(!Object.isUndefined(first) && !Object.isUndefined(second));

    for (const text of ["not a record\n", `not a record\n${second}\n`, `${first}\nnot a record\n${second}\n`]) {
      await writeFile(journal.file, text);
      const reading = await journal.readAsync();

      assert.deepEqual([reading?.isReadable, reading?.records, journal.records], [false, [], []]);
      assert.equal(await readFile(journal.file, "utf8"), text);
    }
  });

  it("reads no record from a journal that holds a whole record of another format version or of a type this version doesn't know, or with a field of the wrong type, and leaves it as it is", async t => {
    const journal = await journalAsync(t);
    await journal.createAsync(script);
    await journal.appendAsync(JournalRecord.Applying);
    const [, applying] = (await readFile(journal.file, "utf8")).split("\n");
    const lineOf = (record: object): string => `${JSON.stringify({ record, sum: createHash("sha256").update(JSON.stringify(record)).digest("hex") })}\n`;
    const beginOf = (version: number): string => lineOf({ ...JournalRecord.begin(script).toJson(), script: { ...script.toJson(), formatVersion: version } });
    const older = `${beginOf(0)}${applying}\n`;
    const newer = `${beginOf(2)}${applying}\n`;
    const unknown = `${beginOf(1)}${applying}\n${lineOf({ ...JournalRecord.Applying.toJson(), type: "Paused" })}`;

    const mistyped = `${beginOf(1)}${applying}\n${lineOf({ ...JournalRecord.Applying.toJson(), step: "first" })}`;

    for (const text of [older, newer, unknown, mistyped]) {
      await writeFile(journal.file, text);
      const reading = await journal.readAsync();

      assert.deepEqual([reading?.isReadable, reading?.records, reading?.script, journal.records], [false, [], null, []]);
      assert.equal(await readFile(journal.file, "utf8"), text);
    }
  });
});
