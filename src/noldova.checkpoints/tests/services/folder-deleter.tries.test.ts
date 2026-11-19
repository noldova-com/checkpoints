/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { setImmediate } from "node:timers/promises";

import { FakeModuleLog } from "@noldova/desktop.runtime/testing";

import { FolderStore } from "../../src/models/folder-store.ts";
import { FolderDeleter } from "../../src/services/folder-deleter.ts";
import { StoreReads } from "../../src/services/store-reads.ts";
import { HeldRename } from "../fixtures/held-rename.fixture.ts";

const uncancelled: AbortSignal = new AbortController().signal;

describe("FolderDeleter's tries", () => {
  const delay = 250;

  it("renames the store again while the system holds a file in it, 20 tries 250 ms apart, and fails with the error after its last try, or at once for another error", async t => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const module = await HeldRename.storesAsync(t);
    const heldTwice = new HeldRename(["EBUSY", "EPERM"]);
    const alwaysHeld = new HeldRename(Array.from({ length: 20 }, () => "EACCES"));
    const otherError = new HeldRename(["EXDEV"]);

    const deleting = new FolderDeleter(module, new FakeModuleLog(), heldTwice.renameAsync, rm, new StoreReads()).deleteAsync(new FolderStore(module, "a"), uncancelled);
    await heldTwice.triedAsync(0);
    t.mock.timers.tick(delay - 1);
    await setImmediate();
    const early = heldTwice.tries.length;
    t.mock.timers.tick(1);
    await heldTwice.triedAsync(1);
    t.mock.timers.tick(delay - 1);
    await setImmediate();
    const second = heldTwice.tries.length;
    t.mock.timers.tick(1);
    await deleting;
    const refusing = assert.rejects(new FolderDeleter(module, new FakeModuleLog(), alwaysHeld.renameAsync, rm, new StoreReads()).deleteAsync(new FolderStore(module, "b"), uncancelled),
      { code: "EACCES" });
    const waited: number[] = [];
    for (let attempt = 0; attempt < 20 - 1; attempt++) {
      await alwaysHeld.triedAsync(attempt);
      t.mock.timers.tick(delay - 1);
      await setImmediate();
      waited.push(alwaysHeld.tries.length);
      t.mock.timers.tick(1);
    }
    await refusing;
    await assert.rejects(new FolderDeleter(module, new FakeModuleLog(), otherError.renameAsync, rm, new StoreReads()).deleteAsync(new FolderStore(module, "b"), uncancelled), { code: "EXDEV" });

    assert.deepEqual([heldTwice.tries, early, second, alwaysHeld.tries.length, otherError.tries.length], [["a", "a", "a"], 1, 2, 20, 1]);
    assert.deepEqual(waited, Array.from({ length: 20 - 1 }, (_, index) => index + 1));
    assert.deepEqual([existsSync(path.join(module, "folders", "a")), existsSync(path.join(module, "folders", "b"))], [false, true]);
  });
});
