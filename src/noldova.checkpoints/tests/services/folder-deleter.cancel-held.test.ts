/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { readdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { FakeModuleLog } from "@noldova/desktop.runtime/testing";

import { FolderStore } from "../../src/models/folder-store.ts";
import { FolderDeleter } from "../../src/services/folder-deleter.ts";
import { StoreReads } from "../../src/services/store-reads.ts";
import { HeldRename } from "../fixtures/held-rename.fixture.ts";

describe("FolderDeleter's cancel between tries", () => {
  it("stops before the rename once its signal aborts, also between two tries without waiting out the delay, leaving the store", async t => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const module = await HeldRename.storesAsync(t);
    const cancelled = new AbortController();
    cancelled.abort(new Error("cancelled before the delete"));
    const between = new AbortController();
    const held = new HeldRename(["EBUSY"]);

    await assert.rejects(new FolderDeleter(module, new FakeModuleLog(), rename, rm, new StoreReads()).deleteAsync(new FolderStore(module, "a"), cancelled.signal), /cancelled before the delete/);
    const deleting = assert.rejects(new FolderDeleter(module, new FakeModuleLog(), held.renameAsync, rm, new StoreReads()).deleteAsync(new FolderStore(module, "a"), between.signal),
      /cancelled while the store was held/);
    await held.triedAsync(0);
    between.abort(new Error("cancelled while the store was held"));
    await deleting;

    assert.deepEqual([held.tries.length, await readdir(path.join(module, "folders", "a", "git", "objects"))], [1, ["pack"]]);
  });
});
