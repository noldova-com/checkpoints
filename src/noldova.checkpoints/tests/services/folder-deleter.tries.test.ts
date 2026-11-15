/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, open, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";
import { setImmediate } from "node:timers/promises";

import { FakeModuleLog } from "@noldova/desktop.runtime/testing";

import { FolderStore } from "../../src/models/folder-store.ts";
import { FolderDeleter } from "../../src/services/folder-deleter.ts";
import { StoreReads } from "../../src/services/store-reads.ts";
import { FailureFixture } from "../fixtures/failure.fixture.ts";

const uncancelled: AbortSignal = new AbortController().signal;
const failure = (code: string): FailureFixture => new FailureFixture(`${code} for the test`, code);

const moduleAsync = async (t: TestContext): Promise<string> => {
  const module = await mkdtemp(path.join(tmpdir(), "checkpoints-delete-"));
  t.after(() => rm(module, { recursive: true, force: true }));
  for (const identity of ["a", "b"]) {
    await mkdir(path.join(module, "folders", identity, "git", "objects"), { recursive: true });
    await writeFile(path.join(module, "folders", identity, "git", "objects", "pack"), "pack");
  }
  return module;
};

class HeldRename {
  private readonly calls: PromiseWithResolvers<void>[];
  private readonly refusals: readonly string[];

  public readonly tries: string[] = [];
  public readonly renameAsync = async (from: string, to: string): Promise<void> => {
    const attempt = this.tries.push(path.basename(from)) - 1;
    this.calls[attempt]?.resolve();
    const code = this.refusals[attempt];
    if (code !== undefined)
      throw failure(code);
    await rename(from, to);
  };

  public constructor(refusals: readonly string[]) {
    this.refusals = refusals;
    this.calls = Array.from({ length: refusals.length + 1 }, () => Promise.withResolvers<void>());
  }

  public async triedAsync(attempt: number): Promise<void> {
    await this.calls[attempt]?.promise;
    await setImmediate();
  }
}

const deletedAsync = async (module: string): Promise<readonly string[]> => await readdir(path.join(module, "deleted"));

describe("FolderDeleter's tries", () => {
  const delay = 250;

  it("renames the store again while the system holds a file in it, 20 tries 250 ms apart, and fails with the error after its last try, or at once for another error", async t => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const module = await moduleAsync(t);
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

  it("stops before the rename once its signal aborts, also between two tries without waiting out the delay, leaving the store", async t => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const module = await moduleAsync(t);
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

  it("deletes a store once the system lets go of a file held open in it, as Windows refuses the move until then", async t => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const module = await moduleAsync(t);
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
