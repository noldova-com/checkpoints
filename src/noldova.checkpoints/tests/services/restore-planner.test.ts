/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { mkdir, readdir, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { ChangeSide, KeepReason, KeptPath, PathKind, PreviewOutcome, PreviewRequest, RestoreAction, RestoreStep, type RestorePlan } from "@noldova/checkpoints.protocol";

import { AccessFixture } from "../fixtures/access.fixture.ts";
import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";
import { ServiceSeams } from "../fixtures/service-seams.fixture.ts";

describe("RestorePlanner", { concurrency: true }, () => {
  const text = (size: number): ChangeSide => new ChangeSide(PathKind.File, size, true);
  const folder = new ChangeSide(PathKind.Folder, null, false);
  const planOf = (plan: RestorePlan | null): RestorePlan => {
    if (plan === null)
      throw new Error("The preview gave no plan.");
    return plan;
  };
  const staysOf = (plan: RestorePlan): readonly (readonly [string, string])[] => plan.stays.map(t => [t.path, t.reason.value]);

  const snapshotAsync = async (location: string): Promise<readonly (readonly [string, string | null])[]> => {
    const names = (await readdir(location, { recursive: true, withFileTypes: true })).map(t => [path.join(t.parentPath, t.name), t.isDirectory()] as const);
    names.sort(([t], [u]) => t < u ? -1 : 1);
    return await Promise.all(names.map(async ([t, u]) => [path.relative(location, t), u ? null : (await readFile(t)).toString("base64")] as const));
  };

  it("plans each path the checkpoint holds and the folder doesn't as written, in a folder now missing too, each it doesn't hold as deleted, and each that differs as replaced", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "a");
    await harness.writeAsync("b.txt", "bb");
    await harness.writeAsync("dir/c.txt", "ccc");
    await harness.writeAsync("dir/c2.txt", "cc");
    const checkpoint = await harness.checkpointAsync(null);
    await harness.writeAsync("a.txt", "a 2");
    await rm(path.join(harness.folder, "b.txt"));
    await harness.writeAsync("d.txt", "dddd");
    await mkdir(path.join(harness.folder, "e"));
    await rm(path.join(harness.folder, "dir"), { recursive: true });

    const result = await harness.previewAsync(checkpoint);
    const plan = planOf(result.plan);

    assert.equal(result.outcome, PreviewOutcome.Planned);
    assert.deepEqual(plan.steps, [
      new RestoreStep("a.txt", RestoreAction.Replace, text(3), text(1)),
      new RestoreStep("b.txt", RestoreAction.Write, null, text(2)),
      new RestoreStep("d.txt", RestoreAction.Delete, text(4), null),
      new RestoreStep("dir/c.txt", RestoreAction.Write, null, text(3)),
      new RestoreStep("dir/c2.txt", RestoreAction.Write, null, text(2)),
      new RestoreStep("e", RestoreAction.Delete, folder, null)
    ]);
    assert.deepEqual([plan.checkpoint, plan.stays, plan.bytesToWrite, plan.spaceNeeded], [checkpoint.id, [], 8, 15]);
    assert.match(plan.state, /^[0-9a-f]{64}$/);
  });

  it("writes nothing to the folder or the store, and leaves no link probe behind", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "a");
    const checkpoint = await harness.checkpointAsync(null);
    await harness.writeAsync("a.txt", "a 2");
    await harness.writeAsync("b.txt", "b");
    const [folderBefore, storeBefore] = await Promise.all([snapshotAsync(harness.folder), snapshotAsync(harness.store)]);

    await harness.previewAsync(checkpoint);

    assert.deepEqual(await snapshotAsync(harness.folder), folderBefore);
    assert.deepEqual(await snapshotAsync(harness.store), storeBefore);
  });

  it("keeps each .git, each folder that holds one and each folder above that, and plans the files inside such a folder each on its own", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync(".git/HEAD", "ref: refs/heads/main\n");
    await harness.writeAsync("tool", "t");
    const checkpoint = await harness.checkpointAsync(null);
    await rm(path.join(harness.folder, "tool"));
    await harness.writeAsync("tool/.git/HEAD", "ref: refs/heads/main\n");
    await harness.writeAsync("tool/y.ts", "y");
    await harness.writeAsync("vendor/lib/.git", "gitdir: elsewhere\n");
    await harness.writeAsync("vendor/lib/x.ts", "x");

    const plan = planOf((await harness.previewAsync(checkpoint)).plan);

    assert.deepEqual(plan.steps, [
      new RestoreStep("tool/y.ts", RestoreAction.Delete, text(1), null),
      new RestoreStep("vendor/lib/x.ts", RestoreAction.Delete, text(1), null)
    ]);
    assert.deepEqual(staysOf(plan), [
      [".git", "Repository"], ["tool", "RepositoryFolder"], ["tool/.git", "Repository"], ["vendor", "RepositoryFolder"],
      ["vendor/lib", "RepositoryFolder"], ["vendor/lib/.git", "Repository"]
    ]);
  });

  it("keeps a name Git treats as .git that a checkpoint holds, and never plans to write it", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("x", "gitdir: elsewhere\n");
    const checkpoint = await harness.checkpointAsync(null);
    const reference = `refs/checkpoints/${checkpoint.id}`;
    const files = (await harness.gitAsync(["ls-tree", `${reference}:files`])).toString("utf8").replace("\tx\n", "\tgit~1\n");
    const filesTree = (await harness.gitAsync(["mktree"], files)).toString("utf8").trim();
    const root = (await harness.gitAsync(["ls-tree", reference])).toString("utf8").replace(/tree [0-9a-f]+\tfiles/, `tree ${filesTree}\tfiles`);
    const rootTree = (await harness.gitAsync(["mktree"], root)).toString("utf8").trim();
    await harness.gitAsync(["update-ref", reference, rootTree]);
    await rm(path.join(harness.folder, "x"));

    const plan = planOf((await harness.previewAsync(checkpoint)).plan);

    assert.deepEqual([plan.steps, plan.stays], [[], [new KeptPath("git~1", KeepReason.Repository)]]);
  });

  it("keeps what either side's rules ignore, the topmost path only, plans nothing under it, and moves no folder that holds it", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    harness.context.settings.write("checkpoints.followIgnoreFiles", true);
    await harness.writeAsync(".gitignore", "out/\n");
    await harness.writeAsync("a.txt", "a");
    await harness.writeAsync("c.log", "c");
    await harness.writeAsync("build", "b");
    const checkpoint = await harness.checkpointAsync(null);
    await harness.writeAsync(".gitignore", "out/\n*.log\n");
    await harness.writeAsync("a.txt", "a 2");
    await harness.writeAsync("c.log", "c 2");
    await harness.writeAsync("d.log", "d");
    await harness.writeAsync("out/x.js", "x");
    await harness.writeAsync("logs/x.log", "l");
    await rm(path.join(harness.folder, "build"));
    await harness.writeAsync("build/out.log", "o");
    await harness.writeAsync("build/a.js", "a");

    const ignoringNow = planOf((await harness.previewAsync(checkpoint)).plan);
    await harness.writeAsync(".gitignore", "*.log\n");
    const ignoringThen = planOf((await harness.previewAsync(checkpoint)).plan);

    assert.deepEqual(ignoringNow.steps, [
      new RestoreStep(".gitignore", RestoreAction.Replace, text(11), text(5)),
      new RestoreStep("a.txt", RestoreAction.Replace, text(3), text(1))
    ]);
    assert.deepEqual(staysOf(ignoringNow), [["build", "Ignored"], ["c.log", "Ignored"], ["d.log", "Ignored"], ["logs", "Ignored"], ["out", "Ignored"]]);
    assert.deepEqual(staysOf(ignoringThen), [["build", "Ignored"], ["c.log", "Ignored"], ["d.log", "Ignored"], ["logs", "Ignored"], ["out/x.js", "Ignored"]]);
  });

  it("keeps a path either side couldn't read", { skip: AccessFixture.isRoot ? "root reads past any file mode" : false }, async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const secret = await harness.writeAsync("secret.txt", "s");
    await harness.writeAsync("open.txt", "o");
    const checkpoint = await harness.checkpointAsync(null);
    await harness.writeAsync("open.txt", "o 2");

    await AccessFixture.whileDeniedAsync(secret, async () => {
      await rm(path.join(harness.store, "index"));
      const plan = planOf((await harness.previewAsync(checkpoint)).plan);

      assert.deepEqual(plan.steps, [new RestoreStep("open.txt", RestoreAction.Replace, text(3), text(1))]);
      assert.deepEqual(staysOf(plan), [["secret.txt", "Unread"]]);
    });
  });

  it("keeps a link, and plans nothing under the path, when the system won't let the module create one", { skip: AccessFixture.isRoot ? "root reads past any file mode" : false }, async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await mkdir(path.join(harness.folder, "target"));
    await symlink(path.join(harness.folder, "target"), path.join(harness.folder, "l"), "junction");
    await harness.writeAsync("a.txt", "a");
    const checkpoint = await harness.checkpointAsync(null);
    await rm(path.join(harness.folder, "l"));
    await harness.writeAsync("l/f", "f");

    await AccessFixture.whileReadOnlyAsync(harness.store, async () => {
      const plan = planOf((await harness.previewAsync(checkpoint)).plan);

      assert.deepEqual([plan.steps, staysOf(plan)], [[], [["l", "LinkUnsupported"]]]);
    });
  });

  it("keeps a link the folder has now, which a rollback would make again, when the system won't let the module create one", { skip: AccessFixture.isRoot ? "root reads past any file mode" : false }, async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("l/f", "f");
    await harness.writeAsync("a.txt", "a");
    await mkdir(path.join(harness.folder, "target"));
    const checkpoint = await harness.checkpointAsync(null);
    await rm(path.join(harness.folder, "l"), { recursive: true });
    await symlink(path.join(harness.folder, "target"), path.join(harness.folder, "l"), "junction");

    await AccessFixture.whileReadOnlyAsync(harness.store, async () => {
      const plan = planOf((await harness.previewAsync(checkpoint)).plan);

      assert.deepEqual([plan.steps, staysOf(plan)], [[], [["l", "LinkUnsupported"]]]);
    });
  });

  it("plans the same state twice, and another once a planned path's content or file id, or a folder on its way, changes", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("dir/a.txt", "a");
    await harness.writeAsync("other.txt", "o");
    const checkpoint = await harness.checkpointAsync(null);
    await harness.writeAsync("dir/a.txt", "b");

    const first = planOf((await harness.previewAsync(checkpoint)).plan);
    const again = planOf((await harness.previewAsync(checkpoint)).plan);
    await harness.writeAsync("other.txt", "p");
    await rm(path.join(harness.folder, "other.txt"));
    await harness.writeAsync("other.txt", "o");
    const unplannedChanged = planOf((await harness.previewAsync(checkpoint)).plan);
    await rename(path.join(harness.folder, "dir"), path.join(harness.folder, "old"));
    await harness.writeAsync("dir/a.txt", "b");
    await rm(path.join(harness.folder, "old"), { recursive: true });
    const folderReplaced = planOf((await harness.previewAsync(checkpoint)).plan);
    await writeFile(path.join(harness.folder, "dir", "a.txt"), "c");
    const contentChanged = planOf((await harness.previewAsync(checkpoint)).plan);

    assert.deepEqual(again.toJson(), first.toJson());
    assert.equal(unplannedChanged.state, first.state);
    assert.deepEqual([folderReplaced.steps, contentChanged.steps], [first.steps, first.steps]);
    assert.equal(new Set([first.state, folderReplaced.state, contentChanged.state]).size, 3);
  });

  it("reports the folder held up while a restore's journal is there, a checkpoint missing, and the folder missing or not a folder", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const never = await harness.previewAsync(CheckpointsHarness.unknownId);
    await harness.writeAsync("a.txt", "a");
    const checkpoint = await harness.checkpointAsync(null);
    const unknown = await harness.previewAsync(CheckpointsHarness.unknownId);
    await rm(harness.folder, { recursive: true });
    const missing = await harness.previewAsync(checkpoint);
    await writeFile(harness.folder, "a file");
    const notFolder = await harness.previewAsync(checkpoint);
    await writeFile(path.join(harness.store, "restore.json"), "{}");
    const heldUp = await harness.previewAsync(checkpoint);

    assert.deepEqual([never, unknown, missing, notFolder, heldUp].map(t => [t.outcome, t.plan]), [
      [PreviewOutcome.CheckpointMissing, null], [PreviewOutcome.CheckpointMissing, null], [PreviewOutcome.FolderMissing, null],
      [PreviewOutcome.FolderMissing, null], [PreviewOutcome.HeldUp, null]
    ]);
  });

  it("reports a folder deleted while it is walked as missing, with no plan", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("sub/a.txt", "a");
    await harness.writeAsync("z.txt", "z");
    const checkpoint = await harness.checkpointAsync(null);
    const service = await harness.createServiceAsync(ServiceSeams.system.withRemovedWhileReading(() => path.join(harness.folder, "sub"), () => harness.folder));

    const result = await service.previewRestoreAsync(new PreviewRequest(harness.reference, checkpoint.id, null));

    assert.deepEqual([result.outcome, result.plan], [PreviewOutcome.FolderMissing, null]);
  });
});
