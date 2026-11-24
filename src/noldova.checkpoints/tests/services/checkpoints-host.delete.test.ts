/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { lstat, mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import {
  CaptureOutcome,
  CaptureRequest,
  DeleteFolderOutcome,
  DeleteFolderRequest,
  FolderReference,
  FolderUsage,
  type CaptureResult,
  type DeleteFolderResult,
  type StorageList
} from "@noldova/checkpoints.protocol";

import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";
import { ServiceSeams } from "../fixtures/service-seams.fixture.ts";

describe("CheckpointsHost's storage and delete", { concurrency: true }, () => {
  const deleteAsync = async (harness: CheckpointsHarness): Promise<DeleteFolderResult> => await harness.service.deleteFolderAsync(new DeleteFolderRequest(harness.reference));

  const sumAsync = async (folder: string): Promise<number> => {
    let bytes = 0;
    for (const entry of await readdir(folder, { withFileTypes: true }))
      bytes += entry.isDirectory() ? await sumAsync(path.join(folder, entry.name)) : (await lstat(path.join(folder, entry.name))).size;
    return bytes;
  };

  it("deletes all of a folder's checkpoints, and the folder's next capture starts a new store", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "alpha");
    await harness.checkpointAsync("1");
    await harness.checkpointAsync("2");

    const deleted = await deleteAsync(harness);

    assert.deepEqual([deleted.outcome, existsSync(harness.store), await harness.listAsync()], [DeleteFolderOutcome.Deleted, false, []]);
    assert.deepEqual((await harness.service.storageAsync()).folders, []);
    const next = await harness.checkpointAsync("3");
    assert.deepEqual((await harness.listAsync()).map(u => u.id), [next.id]);
    assert.deepEqual(await readdir(path.join(harness.context.moduleFolder, "deleted")), []);
  });

  it("answers Deleted for a folder never captured, and lists no space used", async t => {
    const harness = await CheckpointsHarness.startAsync(t);

    assert.equal((await deleteAsync(harness)).outcome, DeleteFolderOutcome.Deleted);
    assert.deepEqual((await harness.service.storageAsync()).folders, []);
  });

  it("deletes only the folder it names", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "alpha");
    await harness.checkpointAsync(null);
    const other = new FolderReference("other", harness.folder);
    await harness.service.captureAsync(new CaptureRequest(other, null));

    await harness.service.deleteFolderAsync(new DeleteFolderRequest(other));

    assert.equal((await harness.listAsync()).length, 1);
    assert.deepEqual((await harness.service.storageAsync()).folders.map(u => u.identity), [CheckpointsHarness.identity]);
  });

  it("waits for a capture running on the folder, then deletes the store with that capture's checkpoint", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "alpha");

    const [captured, deleted] = await Promise.all([harness.captureAsync(null), deleteAsync(harness)]);

    assert.deepEqual([captured.outcome, deleted.outcome, existsSync(harness.store), await harness.listAsync()], [CaptureOutcome.Captured, DeleteFolderOutcome.Deleted, false, []]);
  });

  it("answers HeldUp and deletes nothing while an interrupted restore of the folder can't finish", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "alpha");
    await harness.checkpointAsync(null);
    await writeFile(path.join(harness.store, "restore.json"), "not a record\n");

    const deleted = await deleteAsync(harness);

    assert.deepEqual([deleted.outcome, (await harness.listAsync()).length], [DeleteFolderOutcome.HeldUp, 1]);
    assert.equal(harness.context.events.get("checkpoints.restoreHeldUp")?.length, 2);
  });

  it("lists every folder's space used, the sum of its store's files, the largest first, with the path of its last capture", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "alpha");
    await harness.checkpointAsync(null);
    const otherFolder = path.join(harness.root, "other");
    await mkdir(otherFolder);
    await writeFile(path.join(otherFolder, "large.bin"), randomBytes(64 * 1024));
    await harness.service.captureAsync(new CaptureRequest(new FolderReference("other", otherFolder), null));
    const folders = path.join(harness.context.moduleFolder, "folders");

    const listed = await harness.service.storageAsync();

    assert.deepEqual(listed.folders, [
      new FolderUsage("other", otherFolder, await sumAsync(path.join(folders, "other"))),
      new FolderUsage(CheckpointsHarness.identity, harness.folder, await sumAsync(path.join(folders, CheckpointsHarness.identity)))
    ]);
  });

  it("reads the space used without waiting for a capture running on the folder", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "alpha");
    await harness.checkpointAsync(null);
    const { promise: held, resolve: release } = Promise.withResolvers<void>();
    const { promise: reading, resolve: started } = Promise.withResolvers<void>();
    const heldFreeAsync = async (): Promise<number> => {
      started();
      await held;
      return Number.MAX_SAFE_INTEGER;
    };
    const service = await harness.createServiceAsync(ServiceSeams.system.withReadFree(heldFreeAsync));

    const capturing: Promise<CaptureResult> = service.captureAsync(new CaptureRequest(harness.reference, null));
    await reading;
    const listed = await service.storageAsync();
    release();

    assert.deepEqual(listed.folders.map(u => u.identity), [CheckpointsHarness.identity]);
    assert.equal((await capturing).outcome, CaptureOutcome.Captured);
  });

  it("moves a store only once a read of the space used that started has ended, and leaves the folder out of a read during the move", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "alpha");
    await harness.checkpointAsync(null);
    await harness.service.stopAsync();
    const { promise: held, resolve: release } = Promise.withResolvers<void>();
    const { promise: reading, resolve: started } = Promise.withResolvers<void>();
    let isHeld = false;
    const order: string[] = [];
    const heldStatAsync = async (file: string): Promise<{ readonly size: number }> => {
      if (!isHeld) {
        isHeld = true;
        started();
        await held;
        order.push("read released");
      }
      return await lstat(file);
    };
    const during: StorageList[] = [];
    const renamedAsync = async (from: string, to: string): Promise<void> => {
      order.push("renamed");
      during.push(await service.storageAsync());
      await rename(from, to);
    };
    const service = await harness.createServiceAsync(ServiceSeams.system.withRenameFolder(renamedAsync).withStatFile(heldStatAsync));

    const listing = service.storageAsync();
    await reading;
    const moving = CheckpointsHarness.appearedAsync(path.join(harness.context.moduleFolder, "deleted"), t.signal);
    const deleting = service.deleteFolderAsync(new DeleteFolderRequest(harness.reference));
    await moving;
    release();
    const [listed, deleted] = await Promise.all([listing, deleting]);

    assert.deepEqual([order, listed.folders.map(u => u.identity), during.map(u => u.folders), deleted.outcome, existsSync(harness.store)],
      [["read released", "renamed"], [CheckpointsHarness.identity], [[]], DeleteFolderOutcome.Deleted, false]);
  });

  it("never runs a delete still waiting as the service stops, and leaves the store", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "alpha");
    await harness.checkpointAsync(null);
    const { promise: held, resolve: release } = Promise.withResolvers<void>();
    const { promise: reading, resolve: started } = Promise.withResolvers<void>();
    const heldFreeAsync = async (): Promise<number> => {
      started();
      await held;
      return Number.MAX_SAFE_INTEGER;
    };
    const service = await harness.createServiceAsync(ServiceSeams.system.withReadFree(heldFreeAsync));

    const capturing = service.captureAsync(new CaptureRequest(harness.reference, null));
    await reading;
    const deleting = service.deleteFolderAsync(new DeleteFolderRequest(harness.reference));
    const stopped = service.stopAsync();
    release();

    await assert.rejects(deleting, { name: "AbortError" });
    await assert.rejects(capturing, { name: "AbortError" });
    await stopped;
    assert.deepEqual([existsSync(harness.store), (await harness.listAsync()).length], [true, 1]);
  });

  it("stops a read of the space used running as the service stops, which waits for it, and refuses one after, with no store too", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "alpha");
    await harness.checkpointAsync(null);
    const { promise: held, resolve: release } = Promise.withResolvers<void>();
    const { promise: reading, resolve: started } = Promise.withResolvers<void>();
    const order: string[] = [];
    let isHeld = false;
    const heldStatAsync = async (file: string): Promise<{ readonly size: number }> => {
      if (isHeld)
        return await lstat(file);
      isHeld = true;
      started();
      await held;
      const stats = await lstat(file);
      order.push("read");
      return stats;
    };
    const service = await harness.createServiceAsync(ServiceSeams.system.withStatFile(heldStatAsync));
    const empty = await (await CheckpointsHarness.startAsync(t)).createServiceAsync(ServiceSeams.system);

    const listing = assert.rejects(service.storageAsync(), { name: "AbortError" });
    await reading;
    const stopped = Promise.all([service.stopAsync(), empty.stopAsync()]).then(() => order.push("stopped"));
    release();
    await stopped;
    await listing;

    await assert.rejects(service.storageAsync(), { name: "AbortError" });
    await assert.rejects(empty.storageAsync(), { name: "AbortError" });
    assert.deepEqual(order, ["read", "stopped"]);
  });

  it("waits for a delete running as the service stops, which runs to its end once it has moved the store", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "alpha");
    await harness.checkpointAsync(null);
    await harness.service.stopAsync();
    const { promise: held, resolve: release } = Promise.withResolvers<void>();
    const { promise: moving, resolve: started } = Promise.withResolvers<void>();
    const order: string[] = [];
    const heldRenameAsync = async (from: string, to: string): Promise<void> => {
      started();
      await held;
      await rename(from, to);
      order.push("renamed");
    };
    const service = await harness.createServiceAsync(ServiceSeams.system.withRenameFolder(heldRenameAsync));

    const deleting = service.deleteFolderAsync(new DeleteFolderRequest(harness.reference));
    await moving;
    const stopped = service.stopAsync().then(() => order.push("stopped"));
    release();
    await stopped;

    assert.deepEqual([order, (await deleting).outcome, existsSync(harness.store)], [["renamed", "stopped"], DeleteFolderOutcome.Deleted, false]);
  });

  it("removes as it starts the stores a delete left in deleted/, and ends its stop once that sweep has ended", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const left = path.join(harness.context.moduleFolder, "deleted", "project-1-left");
    await mkdir(path.join(left, "git"), { recursive: true });
    const { promise: held, resolve: release } = Promise.withResolvers<void>();
    const { promise: removing, resolve: started } = Promise.withResolvers<void>();
    const order: string[] = [];
    const removeFolderAsync = async (target: string, options: Parameters<typeof rm>[1]): Promise<void> => {
      order.push("removing");
      started();
      await held;
      await rm(target, options);
      order.push("removed");
    };
    const service = await harness.createServiceAsync(ServiceSeams.system.withRemoveFolder(removeFolderAsync));

    service.startSweep();
    await removing;
    const stopped = service.stopAsync().then(() => order.push("stopped"));
    release();
    await stopped;

    assert.deepEqual([order, existsSync(left)], [["removing", "removed", "stopped"], false]);
  });
});

describe("CheckpointsHost's delete during housekeeping", { concurrency: true }, () => {
  it("stops a pass running on the folder's store, and deletes the store once the pass's Git command has exited", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const service = harness.service;
    await harness.writeAsync("a.txt", "alpha");
    for (let count = 0; count < 7; count++)
      await harness.writeAsync(`large-${count}.bin`, randomBytes(10 * 1024 * 1024));
    const { promise: deleted, resolve, reject } = Promise.withResolvers<DeleteFolderResult>();
    harness.context.watchStart = command => {
      if (command !== "repack")
        return;
      harness.context.watchStart = () => undefined;
      service.deleteFolderAsync(new DeleteFolderRequest(harness.reference)).then(resolve, reject);
    };

    await service.captureAsync(new CaptureRequest(harness.reference, null));
    harness.clock.tick(30_000);

    assert.equal((await deleted).outcome, DeleteFolderOutcome.Deleted);
    assert.equal(harness.context.started.filter(u => u.command === "repack").length, 1);
    assert.deepEqual([existsSync(harness.store), harness.context.running.length], [false, 0]);
  });
});
