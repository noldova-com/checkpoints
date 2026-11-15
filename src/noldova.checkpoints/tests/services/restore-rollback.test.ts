/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { link, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import { RestoreAction } from "@noldova/checkpoints.protocol";
import { FakeModuleLog } from "@noldova/desktop.runtime/testing";

import { FolderStore } from "../../src/models/folder-store.ts";
import { JournalRecordType } from "../../src/models/journal-record-type.ts";
import { JournalRecord } from "../../src/models/journal-record.ts";
import { RestoreRun } from "../../src/models/restore-run.ts";
import { RestoreScript } from "../../src/models/restore-script.ts";
import { ScriptStep } from "../../src/models/script-step.ts";
import type { StagedBlob } from "../../src/models/staged-blob.ts";
import { BlobStager } from "../../src/services/blob-stager.ts";
import { EntryReader } from "../../src/services/entry.reader.ts";
import { FolderWalker } from "../../src/services/folder-walker.ts";
import type { GitRunner } from "../../src/services/git-runner.ts";
import { ObjectReader } from "../../src/services/object.reader.ts";
import { PathGuard } from "../../src/services/path-guard.ts";
import { RestoreJournal } from "../../src/services/restore-journal.ts";
import { RestoreRollback } from "../../src/services/restore-rollback.ts";
import { SideLoader } from "../../src/services/side-loader.ts";
import { TreeLister } from "../../src/services/tree-lister.ts";
import { AccessFixture } from "../fixtures/access.fixture.ts";
import { CheckpointsContext } from "../fixtures/checkpoints-context.fixture.ts";
import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";
import { PreparedRollback } from "../fixtures/prepared-rollback.fixture.ts";

class RemovedOnceStaged extends BlobStager {
  public override async stageAsync(store: FolderStore, blobs: readonly StagedBlob[]): Promise<void> {
    await super.stageAsync(store, blobs);
    await Promise.all(blobs.map(t => rm(t.location)));
  }
}

describe("RestoreRollback", { concurrency: true }, () => {
  const prepareAsync = async (t: TestContext, first: string = "a.txt", changeBeforeAsync: (harness: CheckpointsHarness) => Promise<void> = async () => undefined):
    Promise<PreparedRollback> => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync(first, "a moved aside");
    await harness.writeAsync("b.txt", "b moved aside");
    await changeBeforeAsync(harness);
    const before = await harness.checkpointAsync("Before restore");
    for (const moved of [first, "b.txt"])
      await rm(path.join(harness.folder, ...moved.split("/")), { recursive: true, force: true });
    await mkdir(path.join(harness.folder, ".~r1"));
    await writeFile(path.join(harness.folder, ".~r1", "0.old"), "a moved aside");
    await writeFile(path.join(harness.folder, ".~r1", "1.old"), "b moved aside");
    const steps = [
      new ScriptStep(0, first, RestoreAction.Delete, null, ".~r1/0.old", null, null, null),
      new ScriptStep(1, "b.txt", RestoreAction.Delete, null, ".~r1/1.old", null, null, null)
    ];
    const store = new FolderStore(harness.context.moduleFolder, CheckpointsHarness.identity);
    const script = new RestoreScript("r1", CheckpointsHarness.unknownId, before.id, steps, [], [], new Map());
    return new PreparedRollback(harness, new RestoreRun(store, harness.folder, script, new RestoreJournal(store.restoreFile), new PathGuard(harness.folder, new Map()), new Map()));
  };
  const records = [JournalRecord.Applying, JournalRecord.ofStep(JournalRecordType.Aside, 0), JournalRecord.ofStep(JournalRecordType.Aside, 1)];
  const rollbackOfAsync = async (harness: CheckpointsHarness, log: FakeModuleLog = new FakeModuleLog(), stagerOf: (git: GitRunner) => BlobStager = git => new BlobStager(git)):
    Promise<RestoreRollback> => {
    const git = await harness.createGitRunnerAsync();
    const loader = new SideLoader(new ObjectReader(git), new TreeLister(git), new FolderWalker(process.platform), new EntryReader(process.platform));
    return new RestoreRollback(loader, stagerOf(git), log, link);
  };
  const goneAsync = async (t: TestContext, changeBeforeAsync: (harness: CheckpointsHarness) => Promise<void> = async () => undefined): Promise<PreparedRollback> => {
    const prepared = await prepareAsync(t, "a.txt", changeBeforeAsync);
    await rm(path.join(prepared.harness.folder, ".~r1"), { recursive: true });
    return prepared;
  };
  const notStaged = (reason: string): string =>
    `The rollback of a restore of the folder ${CheckpointsHarness.identity} couldn't stage again the files another program removed from what it moved aside: ${reason}`;

  it("counts an undo that fails for any reason as its path's, and goes on with the others", { skip: AccessFixture.isRoot ? "root reads past any file mode" : false }, async t => {
    const { harness, run } = await prepareAsync(t, "x/a.txt");
    const rollback = await rollbackOfAsync(harness);
    let failed: readonly string[] = [];

    await AccessFixture.whileReadOnlyAsync(path.join(harness.folder, "x"), async () => {
      failed = await rollback.rollBackAsync(run, records);
    });

    assert.deepEqual(failed, ["x/a.txt"]);
    assert.deepEqual((await readdir(harness.folder)).sort(), [".~r1", "b.txt", "x"]);
    assert.deepEqual(await readdir(path.join(harness.folder, ".~r1")), ["0.old"]);
  });

  it("finishes moving back an item whose move stopped before its moved-aside name went", async t => {
    const { harness, run } = await prepareAsync(t);
    await link(path.join(harness.folder, ".~r1", "0.old"), path.join(harness.folder, "a.txt"));

    assert.deepEqual(await (await rollbackOfAsync(harness)).rollBackAsync(run, records), []);
    assert.deepEqual((await readdir(harness.folder)).sort(), ["a.txt", "b.txt"]);
    assert.equal(await readFile(path.join(harness.folder, "a.txt"), "utf8"), "a moved aside");
  });

  it("logs why it couldn't stage again the items another program removed, and counts each as its path's", async t => {
    const { harness, run } = await goneAsync(t);
    const log = new FakeModuleLog();
    const record = (await harness.gitAsync(["hash-object", "-w", "--stdin"], "{\"formatVersion\":99}")).toString("utf8").trim();
    const tree = (await harness.gitAsync(["mktree"], `100644 blob ${record}\tcheckpoint.json\n`)).toString("utf8").trim();
    await harness.gitAsync(["update-ref", `refs/checkpoints/${run.script.before}`, tree]);

    const failed = await (await rollbackOfAsync(harness, log)).rollBackAsync(run, records);

    assert.deepEqual(failed, ["b.txt", "a.txt"]);
    assert.deepEqual(CheckpointsContext.messagesOf(log),
      [notStaged("The checkpoints store's checkpoint.json can't be read: its format version is 99, which this version of the module doesn't read.")]);
  });

  it("counts each removed item as its path's, and logs why, when the checkpoint taken before the restore is gone", async t => {
    const { harness, run } = await goneAsync(t);
    const log = new FakeModuleLog();
    await harness.gitAsync(["update-ref", "-d", `refs/checkpoints/${run.script.before}`]);

    assert.deepEqual(await (await rollbackOfAsync(harness, log)).rollBackAsync(run, records), ["b.txt", "a.txt"]);
    assert.deepEqual(CheckpointsContext.messagesOf(log), [notStaged("the checkpoint taken before the restore is gone")]);
  });

  it("counts each removed item as its path's, and logs why, when the checkpoint taken before the restore holds no file content for it", async t => {
    const withoutFile = async (harness: CheckpointsHarness): Promise<void> => await rm(path.join(harness.folder, "b.txt"));
    const asEmptyFolder = async (harness: CheckpointsHarness): Promise<void> => {
      await withoutFile(harness);
      await mkdir(path.join(harness.folder, "b.txt"));
    };
    for (const changeBeforeAsync of [withoutFile, asEmptyFolder]) {
      const { harness, run } = await goneAsync(t, changeBeforeAsync);
      const log = new FakeModuleLog();

      assert.deepEqual(await (await rollbackOfAsync(harness, log)).rollBackAsync(run, records), ["b.txt", "a.txt"]);
      assert.deepEqual(CheckpointsContext.messagesOf(log), [notStaged("the checkpoint taken before the restore holds no file content for b.txt")]);
    }
  });

  it("logs each removed item whose staged file is missing, and counts it as its path's", async t => {
    const { harness, run } = await goneAsync(t);
    const log = new FakeModuleLog();

    const failed = await (await rollbackOfAsync(harness, log, git => new RemovedOnceStaged(git))).rollBackAsync(run, records);

    assert.deepEqual(failed, ["b.txt", "a.txt"]);
    assert.deepEqual(CheckpointsContext.messagesOf(log), ["b.txt", "a.txt"].map(u =>
      `The rollback of a restore of the folder ${CheckpointsHarness.identity} couldn't undo its change to ${u}, which stays changed: The restore couldn't change ${u}: its staged file is missing`));
  });
});
