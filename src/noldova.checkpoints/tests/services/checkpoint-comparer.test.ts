/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { chmod, mkdir, readFile, readlink, rm, symlink, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { Change, ChangeSide, ChangeStatus, CompareOutcome, CompareRequest, PathKind, UnreadReason } from "@noldova/checkpoints.protocol";

import { AccessFixture } from "../fixtures/access.fixture.ts";
import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";
import { ServiceSeams } from "../fixtures/service-seams.fixture.ts";

describe("CheckpointComparer", { concurrency: true }, () => {
  const text = (kind: PathKind, size: number): ChangeSide => new ChangeSide(kind, size, true);
  const folder = new ChangeSide(PathKind.Folder, null, false);
  const statusesOf = (changes: readonly Change[]): readonly (readonly [string, string])[] => changes.map(t => [t.path, t.status.value]);

  it("gives each change between two checkpoints in the byte order of their paths, with each side's kind, size and whether it's text", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "alpha");
    await harness.writeAsync("b.txt", "beta");
    await harness.writeAsync("c.txt", "gamma");
    const first = await harness.checkpointAsync(null);
    await harness.writeAsync("a.txt", "alpha 2");
    await rm(path.join(harness.folder, "b.txt"));
    await harness.writeAsync("d.bin", Buffer.from([1, 0, 2]));
    await mkdir(path.join(harness.folder, "logs"));
    const second = await harness.checkpointAsync(null);

    const result = await harness.compareAsync(first, second);

    assert.equal(result.outcome, CompareOutcome.Compared);
    assert.deepEqual(result.changes, [
      new Change("a.txt", ChangeStatus.Modified, text(PathKind.File, 5), text(PathKind.File, 7), null),
      new Change("b.txt", ChangeStatus.Deleted, text(PathKind.File, 4), null, null),
      new Change("d.bin", ChangeStatus.Added, null, new ChangeSide(PathKind.File, 3, false), null),
      new Change("logs", ChangeStatus.Added, null, folder, null)
    ]);
  });

  it("compares a checkpoint with the folder now, read in place, and writes nothing to the store", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "alpha");
    await harness.writeAsync("same.txt", "same");
    await harness.writeAsync("gone/x.txt", "x");
    const checkpoint = await harness.checkpointAsync(null);
    await harness.writeAsync("a.txt", "alpha 2");
    await harness.writeAsync("new.bin", Buffer.from([0, 1]));
    await rm(path.join(harness.folder, "gone"), { recursive: true });
    const objects = await harness.objectCountAsync();
    const index = await readFile(path.join(harness.store, "index"));
    const start = harness.context.requests.length;

    const result = await harness.compareAsync(checkpoint, null);

    assert.deepEqual(result.changes, [
      new Change("a.txt", ChangeStatus.Modified, text(PathKind.File, 5), text(PathKind.File, 7), null),
      new Change("gone/x.txt", ChangeStatus.Deleted, text(PathKind.File, 1), null, null),
      new Change("new.bin", ChangeStatus.Added, null, new ChangeSide(PathKind.File, 2, false), null)
    ]);
    assert.equal(await harness.objectCountAsync(), objects);
    assert.deepEqual(await readFile(path.join(harness.store, "index")), index);
    assert.deepEqual(harness.commandsSince(start), ["cat-file", "diff-tree"]);
  });

  it("reads each file of the folder now when the index is gone, and finds nothing changed in a folder that's the same", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "alpha");
    await harness.writeAsync("lib/b.txt", "beta");
    const checkpoint = await harness.checkpointAsync(null);
    await rm(path.join(harness.store, "index"));

    const result = await harness.compareAsync(checkpoint, null);

    assert.deepEqual([result.outcome, result.changes], [CompareOutcome.Compared, []]);
  });

  it("reports the folder now missing, or not a folder, while two of its checkpoints still compare", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const first = await harness.checkpointAsync(null);
    await harness.writeAsync("a.txt", "alpha");
    const second = await harness.checkpointAsync(null);
    await rm(harness.folder, { recursive: true });

    const missing = await harness.compareAsync(first, null);
    const between = await harness.compareAsync(first, second);
    await writeFile(harness.folder, "a file");
    const file = await harness.compareAsync(first, null);

    assert.deepEqual([missing.outcome, missing.changes], [CompareOutcome.FolderMissing, []]);
    assert.deepEqual([file.outcome, file.changes], [CompareOutcome.FolderMissing, []]);
    assert.deepEqual(statusesOf(between.changes), [["a.txt", "Added"]]);
  });

  it("reports a folder deleted while it is walked as missing, with no changes", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("sub/a.txt", "a");
    await harness.writeAsync("z.txt", "z");
    const checkpoint = await harness.checkpointAsync(null);
    const service = await harness.createServiceAsync(ServiceSeams.system.withRemovedWhileReading(() => path.join(harness.folder, "sub"), () => harness.folder));

    const result = await service.compareAsync(new CompareRequest(harness.reference, checkpoint.id, null));

    assert.deepEqual([result.outcome, result.changes], [CompareOutcome.FolderMissing, []]);
  });

  it("reports a checkpoint missing on either side, and for a folder never captured runs no Git", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const never = await harness.compareAsync(CheckpointsHarness.unknownId, null);
    assert.deepEqual(harness.context.requests, []);
    const checkpoint = await harness.checkpointAsync(null);

    const from = await harness.compareAsync(CheckpointsHarness.unknownId, checkpoint);
    const to = await harness.compareAsync(checkpoint, CheckpointsHarness.unknownId);

    for (const result of [never, from, to])
      assert.deepEqual([result.outcome, result.changes], [CompareOutcome.CheckpointMissing, []]);
  });

  it("reports a path that became another kind as KindChanged, and the paths under a new folder as added", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const real = path.join(harness.folder, "real");
    await harness.writeAsync("a", "file a");
    await harness.writeAsync("b", "file b");
    await harness.writeAsync("real/x.txt", "x");
    await symlink(real, path.join(harness.folder, "c"), "junction");
    const first = await harness.checkpointAsync(null);
    const linkSize = (await readlink(path.join(harness.folder, "c"), { encoding: "buffer" })).length;
    await rm(path.join(harness.folder, "a"));
    await symlink(real, path.join(harness.folder, "a"), "junction");
    await rm(path.join(harness.folder, "b"));
    await harness.writeAsync("b/inner.txt", "inner");
    await unlink(path.join(harness.folder, "c"));
    await harness.writeAsync("c", "file c");
    const second = await harness.checkpointAsync(null);

    const result = await harness.compareAsync(first, second);

    assert.deepEqual(result.changes, [
      new Change("a", ChangeStatus.KindChanged, text(PathKind.File, 6), text(PathKind.Link, linkSize), null),
      new Change("b", ChangeStatus.KindChanged, text(PathKind.File, 6), folder, null),
      new Change("b/inner.txt", ChangeStatus.Added, null, text(PathKind.File, 5), null),
      new Change("c", ChangeStatus.KindChanged, text(PathKind.Link, linkSize), text(PathKind.File, 6), null)
    ]);
  });

  it("reports a file that became executable, or stopped being so, as modified", { skip: process.platform === "win32" ? "Windows keeps no executable bit" : false }, async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const location = await harness.writeAsync("run.sh", "#!/bin/sh\n");
    const plain = await harness.checkpointAsync(null);
    await chmod(location, 0o755);
    const executable = await harness.checkpointAsync(null);

    const became = await harness.compareAsync(plain, executable);
    const stopped = await harness.compareAsync(executable, plain);

    assert.deepEqual(became.changes, [new Change("run.sh", ChangeStatus.Modified, text(PathKind.File, 10), text(PathKind.Executable, 10), null)]);
    assert.deepEqual(stopped.changes, [new Change("run.sh", ChangeStatus.Modified, text(PathKind.Executable, 10), text(PathKind.File, 10), null)]);
  });

  it("reports a path either side couldn't read as Unknown, never deleted, with a folder it couldn't read standing for its paths", { skip: AccessFixture.isRoot ? "root reads past any file mode" : false }, async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const secret = await harness.writeAsync("secret.txt", "s");
    await harness.writeAsync("closed/x.txt", "x");
    await harness.writeAsync("closed/y.txt", "y");
    await harness.writeAsync("open.txt", "o");
    const first = await harness.checkpointAsync(null);

    await AccessFixture.whileDeniedAsync(secret, async () => {
      await AccessFixture.whileDeniedAsync(path.join(harness.folder, "closed"), async () => {
        await rm(path.join(harness.store, "index"));
        const now = await harness.compareAsync(first, null);
        const second = await harness.checkpointAsync(null);
        const between = await harness.compareAsync(first, second);
        const back = await harness.compareAsync(second, first);

        const unread = [
          new Change("closed", ChangeStatus.Unknown, folder, null, UnreadReason.Denied),
          new Change("secret.txt", ChangeStatus.Unknown, text(PathKind.File, 1), null, UnreadReason.Denied)
        ];
        assert.deepEqual(now.changes, unread);
        assert.deepEqual(between.changes, unread);
        assert.deepEqual(back.changes, [
          new Change("closed", ChangeStatus.Unknown, null, folder, UnreadReason.Denied),
          new Change("secret.txt", ChangeStatus.Unknown, null, text(PathKind.File, 1), UnreadReason.Denied)
        ]);
      });
    });
  });

  it("finds no .git at any depth on either side, under any name a file system takes for one", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync(".git/HEAD", "ref: refs/heads/main\n");
    await harness.writeAsync("lib/.git", "gitdir: ../.git/modules/lib\n");
    await harness.writeAsync("lib/x.ts", "x");
    await harness.writeAsync("deep/er/.git/config", "[core]\n");
    await harness.writeAsync("short/k.txt", "k");
    const first = await harness.checkpointAsync(null);
    await harness.writeAsync(".git/HEAD", "changed\n");
    await harness.writeAsync(".git/new", "new");
    await harness.writeAsync("lib/.git", "changed\n");
    await harness.writeAsync("short/git~1/y", "y");
    await harness.writeAsync("deep/er/.git/config", "changed\n");
    await harness.writeAsync("deep/.GIT/z", "z");
    const second = await harness.checkpointAsync(null);

    const now = await harness.compareAsync(first, null);
    const between = await harness.compareAsync(first, second);

    assert.deepEqual([now.changes, between.changes], [[], []]);
    assert.ok([...(await harness.treeAsync(second)).keys()].every(u => !/(?:^|\/)(?:\.git|git~1)(?:\/|$)/i.test(u)));
  });

  it("gives names that aren't ASCII as the file system holds them, in their bytes' order", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const names = ["café.txt", "résumé.txt", "日本語/ファイル.txt", "emoji-😀.txt", "Ωmega/naïve.md"];
    for (const name of names)
      await harness.writeAsync(name, "one\n");
    const checkpoint = await harness.checkpointAsync(null);
    for (const name of names)
      await harness.writeAsync(name, "two\n");

    const result = await harness.compareAsync(checkpoint, null);

    const sorted = [...names].sort((u, v) => Buffer.compare(Buffer.from(u), Buffer.from(v)));
    assert.deepEqual(result.changes, sorted.map(u => new Change(u, ChangeStatus.Modified, text(PathKind.File, 4), text(PathKind.File, 4), null)));
  });

  it("gives a name with a leading dash, and one with a line feed where the system allows it, between checkpoints and against the folder now", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const names = ["-dash.txt", ...(process.platform === "win32" ? [] : ["new\nline.txt"])];
    for (const name of names)
      await harness.writeAsync(name, "one\n");
    const first = await harness.checkpointAsync(null);
    for (const name of names)
      await harness.writeAsync(name, "two\n");
    const second = await harness.checkpointAsync(null);
    for (const name of names)
      await harness.writeAsync(name, "three\n");

    const between = await harness.compareAsync(first, second);
    const now = await harness.compareAsync(first, null);

    assert.deepEqual(between.changes, names.map(u => new Change(u, ChangeStatus.Modified, text(PathKind.File, 4), text(PathKind.File, 4), null)));
    assert.deepEqual(now.changes, names.map(u => new Change(u, ChangeStatus.Modified, text(PathKind.File, 4), text(PathKind.File, 6), null)));
  });

  it("walks the folder now in the checkpoint's own mode, and leaves out on both sides what either side's rules ignore", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync(".gitignore", "*.log\nbuild/\n");
    await harness.writeAsync("sub/.gitignore", "*.tmp\n");
    await harness.writeAsync("a.txt", "a");
    await harness.writeAsync("a.log", "log");
    await harness.writeAsync("build/out.js", "out");
    await harness.writeAsync("sub/x.tmp", "tmp");
    await harness.writeAsync("nested/.git/HEAD", "ref: refs/heads/main\n");
    await harness.writeAsync("nested/n.log", "n");
    harness.context.settings.write("checkpoints.followIgnoreFiles", true);
    const following = await harness.checkpointAsync(null);
    harness.context.settings.write("checkpoints.followIgnoreFiles", false);
    const every = await harness.checkpointAsync(null);
    await harness.writeAsync("a.txt", "a 2");
    await harness.writeAsync("a.log", "log 2");
    await harness.writeAsync("new.log", "new");
    await harness.writeAsync("build/out.js", "out 2");
    await harness.writeAsync("sub/x.tmp", "tmp 2");
    await harness.writeAsync("nested/n.log", "n 2");

    const followingNow = await harness.compareAsync(following, null);
    const everyNow = await harness.compareAsync(every, null);
    const between = await harness.compareAsync(following, every);
    const back = await harness.compareAsync(every, following);
    await harness.writeAsync(".gitignore", "*.log\nbuild/\na.txt\n");
    const ignoredNow = await harness.compareAsync(following, null);

    assert.deepEqual(statusesOf(followingNow.changes), [["a.txt", "Modified"], ["nested/n.log", "Modified"]]);
    assert.deepEqual(statusesOf(everyNow.changes), [
      ["a.log", "Modified"], ["a.txt", "Modified"], ["build/out.js", "Modified"], ["nested/n.log", "Modified"], ["new.log", "Added"], ["sub/x.tmp", "Modified"]
    ]);
    assert.deepEqual([between.changes, back.changes], [[], []]);
    assert.deepEqual(statusesOf(ignoredNow.changes), [[".gitignore", "Modified"], ["nested/n.log", "Modified"]]);
  });
});
