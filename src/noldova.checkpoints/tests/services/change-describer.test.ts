/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { lstat } from "node:fs/promises";
import { describe, it, type TestContext } from "node:test";

import { Change, ChangeSide, ChangeStatus, PathKind, UnreadReason } from "@noldova/checkpoints.protocol";

import { EntryKind } from "../../src/models/entry-kind.ts";
import { FolderStore } from "../../src/models/folder-store.ts";
import { FolderFile } from "../../src/models/folder-file.ts";
import { PendingChange } from "../../src/models/pending-change.ts";
import { SideFolder } from "../../src/models/side-folder.ts";
import { TreeFile } from "../../src/models/tree-file.ts";
import { ChangeDescriber } from "../../src/services/change-describer.ts";
import { ObjectReader } from "../../src/services/object.reader.ts";
import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";

describe("ChangeDescriber", { concurrency: true }, () => {
  const uncancelled: AbortSignal = new AbortController().signal;

  const startAsync = async (t: TestContext): Promise<[ChangeDescriber, FolderStore, CheckpointsHarness]> => {
    const harness = await CheckpointsHarness.startAsync(t);
    return [new ChangeDescriber(new ObjectReader(await harness.createGitRunnerAsync())), new FolderStore(harness.context.moduleFolder, CheckpointsHarness.identity), harness];
  };

  const folderFileAsync = async (location: string): Promise<FolderFile> => {
    const stats = await lstat(location, { bigint: true });
    return new FolderFile(EntryKind.File, "id-1", location, Number(stats.size), `${stats.dev}:${stats.ino}`);
  };

  it("gives each side its kind, size and whether it's text, reading the checkpoint's objects with an info of each then a contents, in one cat-file", async t => {
    const [describer, store, harness] = await startAsync(t);
    await harness.writeAsync("a.txt", "alpha");
    await harness.writeAsync("b.bin", Buffer.from([0, 1, 2]));
    const tree = await harness.treeAsync(await harness.checkpointAsync(null));
    const stored = (treePath: string): TreeFile => {
      const entry = tree.get(treePath);
      assert.ok(entry !== undefined);
      return new TreeFile(EntryKind.File, entry.objectId);
    };
    const now = await folderFileAsync(await harness.writeAsync("a.txt", "alpha 2"));
    const start = harness.context.requests.length;
    const written = harness.watchCatFile();

    const changes = await describer.describeAsync(store, harness.folder, [
      new PendingChange("a.txt", ChangeStatus.Modified, stored("files/a.txt"), now, null),
      new PendingChange("b.bin", ChangeStatus.KindChanged, stored("files/b.bin"), SideFolder.Instance, null),
      new PendingChange("c.txt", ChangeStatus.Unknown, stored("files/a.txt"), null, UnreadReason.Denied)
    ], uncancelled);

    assert.deepEqual(changes, [
      new Change("a.txt", ChangeStatus.Modified, new ChangeSide(PathKind.File, 5, true), new ChangeSide(PathKind.File, 7, true), null),
      new Change("b.bin", ChangeStatus.KindChanged, new ChangeSide(PathKind.File, 3, false), new ChangeSide(PathKind.Folder, null, false), null),
      new Change("c.txt", ChangeStatus.Unknown, new ChangeSide(PathKind.File, 5, true), null, UnreadReason.Denied)
    ]);
    assert.deepEqual(harness.context.requests.slice(start).map(u => u.arguments.join(" ")), ["cat-file --batch-command --buffer"]);
    const [a, b] = [stored("files/a.txt").objectId, stored("files/b.bin").objectId];
    assert.deepEqual(written, [`info ${a}`, `info ${b}`, "flush", `contents ${a}`, `contents ${b}`, "flush"]);
  });

  it("runs no Git when no side is a checkpoint's file", async t => {
    const [describer, store, harness] = await startAsync(t);
    const now = await folderFileAsync(await harness.writeAsync("a.txt", "a"));

    const changes = await describer.describeAsync(store, harness.folder, [new PendingChange("a.txt", ChangeStatus.Added, null, now, null)], uncancelled);

    assert.deepEqual(changes, [new Change("a.txt", ChangeStatus.Added, null, new ChangeSide(PathKind.File, 1, true), null)]);
    assert.deepEqual(harness.context.requests, []);
  });
});
