/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { writeSync } from "node:fs";
import { mkdtemp, open, rm, type FileHandle } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import "@noldova/context.core";

import { JournalRecord } from "../../src/models/journal-record.ts";
import { RestoreScript } from "../../src/models/restore-script.ts";
import { RestoreJournal } from "../../src/services/restore-journal.ts";

describe("RestoreJournal's short create", () => {
  it("writes the rest of the first record whose write wrote only part of it, so the journal it renames into place reads whole", async t => {
    const folder = await mkdtemp(path.join(tmpdir(), "restore-journal-"));
    t.after(() => rm(folder, { recursive: true, force: true }));
    const script = new RestoreScript("r1", "01890a5d-ac96-774b-bcce-b302099a8057", "01890a5d-ac96-774b-bcce-b302099a8058", [], ["dir"], [], new Map([["", "1:2"]]));
    const journal = new RestoreJournal(path.join(folder, "restore.json"));
    const opened = await open(path.join(folder, "probe"), "w");
    const prototype: unknown = opened.constructor.prototype;
    await opened.close();
    await rm(path.join(folder, "probe"));
    const isWriting = (value: unknown): value is Pick<FileHandle, "write"> =>
      Object.isObject(value) && "write" in value && Object.isFunction(value.write);
    assert.ok(isWriting(prototype));
    t.mock.method(prototype, "write", async function (this: FileHandle, data: string | Buffer): Promise<{ bytesWritten: number; buffer: string | Buffer }> {
      const bytes = Object.isString(data) ? Buffer.from(data) : data;
      return { bytesWritten: writeSync(this.fd, bytes, 0, 20), buffer: data };
    }, { times: 1 });

    await journal.createAsync(script);

    const reading = await new RestoreJournal(journal.file).readAsync();
    assert.deepEqual([reading?.isReadable, reading?.records.map(u => u.toJson())], [true, [JournalRecord.begin(script).toJson()]]);
  });
});
