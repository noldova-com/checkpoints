/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { mkdtemp, open, readdir, readFile, rm, type FileHandle } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import { FolderRecord } from "../../src/models/folder-record.ts";
import { StoreFile } from "../../src/services/store-file.ts";

const folderAsync = async (t: TestContext): Promise<string> => {
  const folder = await mkdtemp(path.join(tmpdir(), "store-file-"));
  t.after(() => rm(folder, { recursive: true, force: true }));
  return folder;
};

describe("StoreFile's syncs", () => {
  it("writes a file whole, through a temporary file synced and renamed into place, its folder synced after, and reads it back", async t => {
    const folder = await folderAsync(t);
    const file = path.join(folder, "folder.json");
    const opened = await open(path.join(folder, "probe"), "w");
    const prototype: unknown = opened.constructor.prototype;
    await opened.close();
    await rm(path.join(folder, "probe"));
    const isSyncing = (value: unknown): value is Pick<FileHandle, "sync"> =>
      typeof value === "object" && value !== null && "sync" in value && typeof value.sync === "function";
    assert.ok(isSyncing(prototype));
    const sync = t.mock.method(prototype, "sync");

    await StoreFile.writeAsync(file, new FolderRecord("/p").toJson());
    const synced = sync.mock.callCount();
    await StoreFile.writeAsync(file, new FolderRecord("/q").toJson());

    assert.equal((await StoreFile.readAsync(file, u => FolderRecord.fromJson(u)))?.path, "/q");
    assert.deepEqual(await readdir(folder), ["folder.json"]);
    assert.deepEqual(JSON.parse(await readFile(file, "utf8")), { formatVersion: 1, path: "/q" });
    assert.deepEqual([synced, sync.mock.callCount()], [2, 4]);
  });
});
