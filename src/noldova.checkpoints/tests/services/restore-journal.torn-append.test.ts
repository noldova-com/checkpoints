/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { appendFile, mkdtemp, open, readFile, rm, type FileHandle } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { JournalRecordType } from "../../src/models/journal-record-type.ts";
import { JournalRecord } from "../../src/models/journal-record.ts";
import { RestoreScript } from "../../src/models/restore-script.ts";
import { RestoreJournal } from "../../src/services/restore-journal.ts";

describe("RestoreJournal's torn append", () => {
  it("cuts a failed append back to the last whole record, so the next append and a read keep both whole records", async t => {
    const folder = await mkdtemp(path.join(tmpdir(), "restore-journal-"));
    t.after(() => rm(folder, { recursive: true, force: true }));
    const script = new RestoreScript("r1", "01890a5d-ac96-774b-bcce-b302099a8057", "01890a5d-ac96-774b-bcce-b302099a8058", [], ["dir"], [], new Map([["", "1:2"]]));
    const journal = new RestoreJournal(path.join(folder, "restore.json"));
    await journal.createAsync(script);
    const whole = await readFile(journal.file);
    const opened = await open(path.join(folder, "probe"), "w");
    const prototype: unknown = opened.constructor.prototype;
    await opened.close();
    await rm(path.join(folder, "probe"));
    const isWriting = (value: unknown): value is Pick<FileHandle, "write"> =>
      typeof value === "object" && value !== null && "write" in value && typeof value.write === "function";
    assert.ok(isWriting(prototype));
    const write = t.mock.method(prototype, "write");
    write.mock.mockImplementationOnce(async (data: unknown) => {
      await appendFile(journal.file, String(data).slice(0, 20));
      throw Object.assign(new Error("no space left on device"), { code: "ENOSPC" });
    });

    await assert.rejects(journal.appendAsync(JournalRecord.Applying), { code: "ENOSPC" });
    assert.deepEqual(await readFile(journal.file), whole);
    await journal.appendAsync(JournalRecord.ofPath(JournalRecordType.Created, "dir"));

    const reading = await new RestoreJournal(journal.file).readAsync();
    assert.deepEqual([reading?.isReadable, reading?.records.map(u => u.toJson())],
      [true, [JournalRecord.begin(script).toJson(), JournalRecord.ofPath(JournalRecordType.Created, "dir").toJson()]]);
  });
});
