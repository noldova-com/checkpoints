/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import { FakeModuleLog } from "@noldova/desktop.runtime/testing";

import { FolderStore } from "../../src/models/folder-store.ts";
import { FolderDeleter } from "../../src/services/folder-deleter.ts";
import { StoreReads } from "../../src/services/store-reads.ts";
import { CheckpointsContext } from "../fixtures/checkpoints-context.fixture.ts";
import { FailureFixture } from "../fixtures/failure.fixture.ts";

class SignallingReads extends StoreReads {
  public readonly begun: PromiseWithResolvers<void> = Promise.withResolvers<void>();

  public override async moveAsync<T>(identity: string, move: () => Promise<T>): Promise<T> {
    const moved = super.moveAsync(identity, move);
    this.begun.resolve();
    return await moved;
  }
}

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

const deletedAsync = async (module: string): Promise<readonly string[]> => await readdir(path.join(module, "deleted"));

describe("FolderDeleter", { concurrency: true }, () => {
  it("removes the folder's store whole, through deleted/, and leaves every other store", async t => {
    const module = await moduleAsync(t);
    const log = new FakeModuleLog();

    await new FolderDeleter(module, log, rename, rm, new StoreReads()).deleteAsync(new FolderStore(module, "a"), uncancelled);

    assert.deepEqual([existsSync(path.join(module, "folders", "a")), existsSync(path.join(module, "folders", "b")), await deletedAsync(module), CheckpointsContext.messagesOf(log)],
      [false, true, [], []]);
  });

  it("leaves a folder that has no store as it is", async t => {
    const module = await moduleAsync(t);

    await new FolderDeleter(module, new FakeModuleLog(), rename, rm, new StoreReads()).deleteAsync(new FolderStore(module, "never"), uncancelled);

    assert.deepEqual([(await readdir(path.join(module, "folders"))).sort(), await deletedAsync(module)], [["a", "b"], []]);
  });

  it("runs to its end once the store is renamed, though its signal aborts then", async t => {
    const module = await moduleAsync(t);
    const cancel = new AbortController();
    const renamedAsync = async (from: string, to: string): Promise<void> => {
      await rename(from, to);
      cancel.abort(new Error("cancelled after the rename"));
    };

    await new FolderDeleter(module, new FakeModuleLog(), renamedAsync, rm, new StoreReads()).deleteAsync(new FolderStore(module, "a"), cancel.signal);

    assert.deepEqual([existsSync(path.join(module, "folders", "a")), await deletedAsync(module)], [false, []]);
  });

  it("writes a removal that fails to the module's log, leaving the store in deleted/ for the sweep, which removes it", async t => {
    const module = await moduleAsync(t);
    const log = new FakeModuleLog();
    const refusedAsync = async (): Promise<void> => {
      throw failure("EPERM");
    };

    await new FolderDeleter(module, log, rename, refusedAsync, new StoreReads()).deleteAsync(new FolderStore(module, "a"), uncancelled);
    const [left] = await deletedAsync(module);
    await new FolderDeleter(module, log, rename, rm, new StoreReads()).sweepAsync(uncancelled);

    assert.match(left ?? "", /^a-[0-9a-f-]{36}$/);
    assert.deepEqual(CheckpointsContext.messagesOf(log), [`Removing the deleted store ${path.join(module, "deleted", left ?? "")} failed, so it is removed again when the module next starts: EPERM for the test`]);
    assert.deepEqual([existsSync(path.join(module, "folders", "a")), await deletedAsync(module)], [false, []]);
  });

  it("sweeps what deleted/ holds as it starts, but a store a delete is removing then, and writes each it can't remove to the log", async t => {
    const module = await moduleAsync(t);
    const log = new FakeModuleLog();
    for (const name of ["left-1", "left-2"])
      await mkdir(path.join(module, "deleted", name), { recursive: true });
    const { promise: held, resolve: release } = Promise.withResolvers<void>();
    const { promise: removing, resolve: started } = Promise.withResolvers<void>();
    const removed: string[] = [];
    const removeFolderAsync = async (target: string, options: Parameters<typeof rm>[1]): Promise<void> => {
      removed.push(path.basename(target));
      if (path.basename(target).startsWith("a-")) {
        started();
        await held;
      }
      if (path.basename(target) === "left-2")
        throw failure("EBUSY");
      await rm(target, options);
    };
    const deleter = new FolderDeleter(module, log, rename, removeFolderAsync, new StoreReads());

    const deleting = deleter.deleteAsync(new FolderStore(module, "a"), uncancelled);
    await removing;
    await deleter.sweepAsync(uncancelled);
    release();
    await deleting;

    assert.deepEqual([removed.length, removed.filter(u => u.startsWith("a-")).length, removed.filter(u => u.startsWith("left-")).sort()], [3, 1, ["left-1", "left-2"]]);
    assert.deepEqual([await deletedAsync(module), CheckpointsContext.messagesOf(log).length], [["left-2"], 1]);
  });

  it("moves a store only once the reads of it that started have ended, and leaves it out of a read that starts during the move", async t => {
    const module = await moduleAsync(t);
    const reads = new SignallingReads();
    const order: string[] = [];
    const { promise: reading, resolve: release } = Promise.withResolvers<void>();
    const renamedAsync = async (from: string, to: string): Promise<void> => {
      order.push("renamed");
      await rename(from, to);
    };
    const read = reads.readAsync("a", async () => {
      await reading;
      order.push("read");
    });

    const deleting = new FolderDeleter(module, new FakeModuleLog(), renamedAsync, rm, reads).deleteAsync(new FolderStore(module, "a"), uncancelled);
    await Promise.race([reads.begun.promise, deleting.then(() => assert.fail("The delete never began its move."))]);
    const during = await reads.readAsync("a", async () => "read during the move");
    release();
    await Promise.all([read, deleting]);

    assert.deepEqual([order, during, existsSync(path.join(module, "folders", "a"))], [["read", "renamed"], null, false]);
  });

  it("stops sweeping before its next store once its signal aborts, leaving the rest for the next start", async t => {
    const module = await moduleAsync(t);
    for (const name of ["left-1", "left-2"])
      await mkdir(path.join(module, "deleted", name), { recursive: true });
    const stop = new AbortController();
    const removeFolderAsync = async (target: string, options: Parameters<typeof rm>[1]): Promise<void> => {
      stop.abort();
      await rm(target, options);
    };

    await new FolderDeleter(module, new FakeModuleLog(), rename, removeFolderAsync, new StoreReads()).sweepAsync(stop.signal);

    assert.equal((await deletedAsync(module)).length, 1);
  });

  it("sweeps nothing when deleted/ doesn't exist, and writes a deleted/ it can't list to the log", async t => {
    const module = await moduleAsync(t);
    const log = new FakeModuleLog();

    await new FolderDeleter(module, log, rename, rm, new StoreReads()).sweepAsync(uncancelled);
    await writeFile(path.join(module, "deleted"), "not a folder");
    await new FolderDeleter(module, log, rename, rm, new StoreReads()).sweepAsync(uncancelled);

    assert.equal(CheckpointsContext.messagesOf(log).length, 1);
    assert.match(CheckpointsContext.messagesOf(log)[0] ?? "", /^Removing the deleted store .*deleted failed, so it is removed again when the module next starts: ENOTDIR/);
  });
});
