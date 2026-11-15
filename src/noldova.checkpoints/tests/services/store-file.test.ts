/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { mkdtemp, open, readdir, readFile, rm, writeFile, type FileHandle } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import { NotAnObjectException } from "@noldova/checkpoints.protocol";

import { StoreFileUnreadableException, UnsupportedStoreFormatException } from "../../src/api/index.ts";
import { FolderRecord } from "../../src/models/folder-record.ts";
import { StoreFile } from "../../src/services/store-file.ts";

const folderAsync = async (t: TestContext): Promise<string> => {
  const folder = await mkdtemp(path.join(tmpdir(), "store-file-"));
  t.after(() => rm(folder, { recursive: true, force: true }));
  return folder;
};

describe("StoreFile", { concurrency: true }, () => {
  it("gives null for a file that doesn't exist yet", async t => {
    const folder = await folderAsync(t);

    assert.equal(await StoreFile.readAsync(path.join(folder, "index"), u => FolderRecord.fromJson(u)), null);
  });

  it("fails as the system does for a file it can't read", async t => {
    const folder = await folderAsync(t);

    await assert.rejects(StoreFile.readAsync(folder, u => FolderRecord.fromJson(u)), { code: "EISDIR" });
  });

  it("fails naming the file when it isn't JSON, isn't the model's form, or is of another format version", async t => {
    const folder = await folderAsync(t);
    const file = path.join(folder, "folder.json");
    const readAsync = (): Promise<FolderRecord | null> => StoreFile.readAsync(file, u => FolderRecord.fromJson(u));

    await writeFile(file, "{");
    await assert.rejects(readAsync(), (error: Error) => error instanceof StoreFileUnreadableException && error.file === "folder.json"
      && error.message.startsWith("The checkpoints store's folder.json can't be read: ") && error.cause instanceof SyntaxError);
    await writeFile(file, "[]");
    await assert.rejects(readAsync(), (error: Error) => error instanceof StoreFileUnreadableException
      && error.message === "The checkpoints store's folder.json can't be read: FolderRecord must be a JSON object." && error.cause instanceof NotAnObjectException);
    await writeFile(file, "{\"formatVersion\":3,\"path\":\"/p\"}");
    await assert.rejects(readAsync(), (error: Error) => error instanceof StoreFileUnreadableException
      && error.message === "The checkpoints store's folder.json can't be read: its format version is 3, which this version of the module doesn't read."
      && error.cause instanceof UnsupportedStoreFormatException);
  });

  it("lets any other failure of the reading through as it is", () => {
    const failure = new RangeError("broken");

    assert.throws(() => StoreFile.parse("index", "{}", () => {
      throw failure;
    }), failure);
  });
});

describe("StoreFile, alone", () => {
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
