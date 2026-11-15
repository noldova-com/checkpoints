/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import { FolderStore } from "../../src/models/folder-store.ts";
import { FastImportLeftovers } from "../../src/services/fast-import-leftovers.ts";

describe("FastImportLeftovers", { concurrency: true }, () => {
  const createStoreAsync = async (t: TestContext): Promise<FolderStore> => {
    const folder = await mkdtemp(path.join(tmpdir(), "fast-import-leftovers-"));
    t.after(() => rm(folder, { recursive: true, force: true }));
    const store = new FolderStore(folder, "folder");
    await mkdir(path.join(store.gitFolder, "objects", "pack"), { recursive: true });
    await mkdir(path.join(store.gitFolder, "objects", "ab"));
    await writeFile(path.join(store.gitFolder, "objects", "ab", "cdef"), "kept");
    return store;
  };

  const addRunAsync = async (store: FolderStore): Promise<void> => {
    await writeFile(path.join(store.gitFolder, "objects", "pack", "pack-1.pack"), "run");
    await mkdir(path.join(store.gitFolder, "objects", "12"));
    await writeFile(path.join(store.gitFolder, "objects", "12", "3456"), "run");
    await writeFile(path.join(store.gitFolder, "objects", "ab", "0123"), "run");
    await writeFile(path.join(store.gitFolder, "fast_import_crash_42"), "run");
  };

  it("removes the packs, loose objects, loose-object folders and crash reports added since its listing, and keeps the rest", async t => {
    const store = await createStoreAsync(t);
    const leftovers = new FastImportLeftovers(store);
    await leftovers.listOnceAsync();
    await addRunAsync(store);
    await leftovers.listOnceAsync();

    await leftovers.removeAddedAsync();

    assert.deepEqual((await readdir(path.join(store.gitFolder, "objects"), { recursive: true })).map(t => t.split(path.sep).join("/")).sort(), ["ab", "ab/cdef", "pack"]);
    assert.deepEqual(await readdir(store.gitFolder), ["objects"]);
  });

  it("removes nothing when it never listed, since no check of the space ran", async t => {
    const store = await createStoreAsync(t);
    await addRunAsync(store);

    await new FastImportLeftovers(store).removeAddedAsync();

    assert.equal((await readdir(path.join(store.gitFolder, "objects"), { recursive: true })).length, 7);
    assert.deepEqual(await readdir(store.gitFolder), ["fast_import_crash_42", "objects"]);
  });
});
