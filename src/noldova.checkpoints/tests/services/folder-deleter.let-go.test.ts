/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { open, readdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { setImmediate } from "node:timers/promises";

import { FakeModuleLog } from "@noldova/desktop.runtime/testing";

import { FolderStore } from "../../src/models/folder-store.ts";
import { FolderDeleter } from "../../src/services/folder-deleter.ts";
import { StoreReads } from "../../src/services/store-reads.ts";
import { HeldRename } from "../fixtures/held-rename.fixture.ts";

const uncancelled: AbortSignal = new AbortController().signal;

const deletedAsync = async (module: string): Promise<readonly string[]> => await readdir(path.join(module, "deleted"));

describe("FolderDeleter on a file the system holds open", () => {
  const delay = 250;

  it("deletes a store once the system lets go of a file held open in it, as Windows refuses the move until then", async t => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const module = await HeldRename.storesAsync(t);
    const refused = Promise.withResolvers<void>();
    const held = await open(path.join(module, "folders", "a", "git", "objects", "pack"), "r");
    let isOpen = true;
    const letGoAsync = async (): Promise<void> => {
      if (isOpen) {
        isOpen = false;
        await held.close();
      }
    };
    t.after(letGoAsync);
    const order: string[] = [];
    const renameFolderAsync = async (from: string, to: string): Promise<void> => {
      try {
        await rename(from, to);
        order.push(isOpen ? "moved with the file open" : "moved");
      }
      catch (error) {
        order.push("refused");
        await letGoAsync();
        refused.resolve();
        throw error;
      }
    };

    const deleting = new FolderDeleter(module, new FakeModuleLog(), renameFolderAsync, rm, new StoreReads()).deleteAsync(new FolderStore(module, "a"), uncancelled);
    await Promise.race([deleting, refused.promise]);
    await setImmediate();
    t.mock.timers.tick(delay - 1);
    await setImmediate();
    const early = [...order];
    t.mock.timers.tick(1);
    t.mock.timers.reset();
    await deleting;

    assert.deepEqual([existsSync(path.join(module, "folders", "a")), await deletedAsync(module)], [false, []]);
    assert.deepEqual([early, order], process.platform === "win32" ? [["refused"], ["refused", "moved"]] : [["moved with the file open"], ["moved with the file open"]]);
  });
});
