/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import { JsonException } from "@noldova/context.json";

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
      && error.message === "The checkpoints store's folder.json can't be read: FolderRecord: Expected a JSON object." && error.cause instanceof JsonException);
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
