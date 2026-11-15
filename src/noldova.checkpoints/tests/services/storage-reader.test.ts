/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import type { Dirent } from "node:fs";
import { lstat, mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import { FolderUsage } from "@noldova/checkpoints.protocol";

import { FolderRecord } from "../../src/models/folder-record.ts";
import { StorageReader } from "../../src/services/storage-reader.ts";
import { StoreReads } from "../../src/services/store-reads.ts";
import { FailureFixture } from "../fixtures/failure.fixture.ts";

describe("StorageReader", { concurrency: true }, () => {
  const uncancelled: AbortSignal = new AbortController().signal;
  const failure = (code: string): FailureFixture => new FailureFixture(`${code} for the test`, code);
  const listAsync = async (folder: string): Promise<Dirent[]> => await readdir(folder, { withFileTypes: true });

  const moduleAsync = async (t: TestContext): Promise<string> => {
    const root = await mkdtemp(path.join(tmpdir(), "checkpoints-storage-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    return root;
  };

  const fileAsync = async (module: string, relativePath: string, size: number): Promise<string> => {
    const file = path.join(module, "folders", ...relativePath.split("/"));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, Buffer.alloc(size));
    return file;
  };

  const folderFileAsync = async (module: string, identity: string, content: string): Promise<number> => {
    await fileAsync(module, `${identity}/folder.json`, 0);
    await writeFile(path.join(module, "folders", identity, "folder.json"), content);
    return Buffer.byteLength(content);
  };

  it("gives no folders when none was ever captured", async t => {
    const module = await moduleAsync(t);

    assert.deepEqual((await new StorageReader(listAsync, lstat, new StoreReads()).readAsync(module, uncancelled)).folders, []);
  });

  it("lists each folder with the sum of its store's files, the largest first and those of one size by identity, with the path folder.json keeps", async t => {
    const module = await moduleAsync(t);
    const kept = await folderFileAsync(module, "large", JSON.stringify(new FolderRecord("/work/large").toJson()));
    await fileAsync(module, "large/git/objects/pack/pack-1.pack", 3000);
    await fileAsync(module, "large/index", 100);
    await mkdir(path.join(module, "folders", "large", "git", "refs", "checkpoints"), { recursive: true });
    for (const identity of ["c", "a", "b"])
      await fileAsync(module, `${identity}/index`, 10);
    await fileAsync(module, "stray-file", 5);
    await fileAsync(module, "not.an_identity/index", 5);
    const order = ["b", "large", "a", "c"];
    const rank = (name: string): number => order.includes(name) ? order.indexOf(name) : order.length;
    const listFolderAsync = async (folder: string): Promise<Dirent[]> => (await readdir(folder, { withFileTypes: true })).sort((a, b) => rank(a.name) - rank(b.name));

    const listed = await new StorageReader(listFolderAsync, lstat, new StoreReads()).readAsync(module, uncancelled);

    assert.deepEqual(listed.folders, [
      new FolderUsage("large", "/work/large", 3100 + kept),
      new FolderUsage("a", null, 10),
      new FolderUsage("b", null, 10),
      new FolderUsage("c", null, 10)
    ]);
  });

  it("gives no path for a folder.json the module didn't write, or that keeps a path that isn't absolute", async t => {
    const module = await moduleAsync(t);
    const broken = await folderFileAsync(module, "broken", "{");
    const relative = await folderFileAsync(module, "relative", JSON.stringify(new FolderRecord("work/relative").toJson()));

    const listed = await new StorageReader(listAsync, lstat, new StoreReads()).readAsync(module, uncancelled);

    assert.deepEqual(listed.folders, [new FolderUsage("relative", null, relative), new FolderUsage("broken", null, broken)]);
  });

  it("leaves out a folder that goes away while it reads, and counts nothing for a file or a folder inside one that does", async t => {
    const module = await moduleAsync(t);
    await fileAsync(module, "gone/index", 10);
    await fileAsync(module, "kept/index", 10);
    await fileAsync(module, "kept/git/HEAD", 20);
    await fileAsync(module, "kept/git/objects/a", 30);
    const listFolderAsync = async (folder: string): Promise<Dirent[]> => {
      if (path.basename(folder) === "gone" || path.basename(folder) === "objects")
        throw failure("ENOENT");
      return await readdir(folder, { withFileTypes: true });
    };
    const statFileAsync = async (file: string): Promise<{ readonly size: number }> => {
      if (path.basename(file) === "HEAD")
        throw failure("ENOENT");
      return await lstat(file);
    };

    const listed = await new StorageReader(listFolderAsync, statFileAsync, new StoreReads()).readAsync(module, uncancelled);

    assert.deepEqual(listed.folders, [new FolderUsage("kept", null, 10)]);
  });

  it("fails when it can't list the store's folders or read a file's size for another reason", async t => {
    const module = await moduleAsync(t);
    await fileAsync(module, "a/index", 10);

    await assert.rejects(new StorageReader(async () => { throw failure("EACCES"); }, lstat, new StoreReads()).readAsync(module, uncancelled), { code: "EACCES" });
    await assert.rejects(new StorageReader(listAsync, async () => { throw failure("EIO"); }, new StoreReads()).readAsync(module, uncancelled), { code: "EIO" });
  });

  it("stops before its next entry once its signal aborts, inside a folder too, with the signal's reason", async t => {
    const module = await moduleAsync(t);
    await fileAsync(module, "a/index", 10);
    await fileAsync(module, "a/folder.json", 10);
    const cancelled = new AbortController();
    cancelled.abort(new Error("cancelled before it starts"));
    const midway = new AbortController();
    const statFileAsync = async (file: string): Promise<{ readonly size: number }> => {
      midway.abort(new Error("cancelled after a file"));
      return await lstat(file);
    };

    await assert.rejects(new StorageReader(listAsync, lstat, new StoreReads()).readAsync(module, cancelled.signal), /cancelled before it starts/);
    await assert.rejects(new StorageReader(listAsync, statFileAsync, new StoreReads()).readAsync(module, midway.signal), /cancelled after a file/);
  });
});
