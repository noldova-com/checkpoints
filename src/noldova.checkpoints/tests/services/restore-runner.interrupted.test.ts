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

import "@noldova/context.core";
import { RestoreOutcome } from "@noldova/checkpoints.protocol";
import { ProcessPresence } from "@noldova/desktop.runtime";

import { JournalRecordType } from "../../src/models/journal-record-type.ts";
import { RestorePaths } from "../../src/services/restore-paths.ts";
import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";
import { PreparedRestore } from "../fixtures/prepared-restore.fixture.ts";
import { RestoreFolder } from "../fixtures/restore-folder.fixture.ts";
import { ScriptedJournal } from "../fixtures/scripted-journal.fixture.ts";
import { ServiceSeams } from "../fixtures/service-seams.fixture.ts";
import { StopPoint } from "../fixtures/stop-point.fixture.ts";
import { StoppedRestore } from "../fixtures/stopped-restore.fixture.ts";
import { StoppedRun } from "../fixtures/stopped-run.fixture.ts";

const RECORDS: readonly JournalRecordType[] = [
  JournalRecordType.Applying, JournalRecordType.Aside, JournalRecordType.Aside, JournalRecordType.Aside,
  JournalRecordType.Aside, JournalRecordType.Aside, JournalRecordType.Aside, JournalRecordType.Aside,
  JournalRecordType.Aside, JournalRecordType.Created, JournalRecordType.Created, JournalRecordType.Placing,
  JournalRecordType.Placing, JournalRecordType.Placing, JournalRecordType.Placing, JournalRecordType.Placing,
  JournalRecordType.Placing, JournalRecordType.Removing, JournalRecordType.Cleaning
];

describe("RestoreRunner, interrupted", { concurrency: true }, () => {
  it("restores in full the run its stopped restores are cut from, writing exactly the records they stop at to its journal", async t => {
    const reference = await CheckpointsHarness.startAsync(t);
    let full: ScriptedJournal | undefined;
    const service = await reference.createServiceAsync(ServiceSeams.system.withJournals(file => full = new ScriptedJournal(file)));
    const prepared = await PreparedRestore.prepareAsync(reference);

    const result = await reference.restoreAsync(await reference.planAsync(prepared.checkpoint), service);

    assert.equal(result.outcome, RestoreOutcome.Restored);
    assert.deepEqual(await reference.snapshotAsync(), prepared.saved);
    assert.deepEqual(full?.appended.map(u => u.type), RECORDS);
  });

  RECORDS.forEach((type, record) => {
    it(`finishes a restore interrupted before record ${record} (${type.value}) of its journal once applying, or discards it before, when the folder is next opened`, async t => {
      const { harness, prepared, now } = await StoppedRun.stopAsync(t, StopPoint.before(record));
      const applying = (await RestoreFolder.of(harness).recordsAsync()).some(u => u.type === JournalRecordType.Applying);
      await harness.listAsync();

      assert.deepEqual(await harness.snapshotAsync(), applying ? prepared.saved : now);
      await RestoreFolder.of(harness).assertCleanAsync();
    });
  });

  it("finishes a restore interrupted at the removal of its journal when the folder is next opened", async t => {
    const { harness, prepared } = await StoppedRun.stopAsync(t, StopPoint.atRemoval());
    assert.ok((await RestoreFolder.of(harness).recordsAsync()).some(u => u.type === JournalRecordType.Applying));
    await harness.listAsync();

    assert.deepEqual(await harness.snapshotAsync(), prepared.saved);
    await RestoreFolder.of(harness).assertCleanAsync();
  });

  RECORDS.forEach((type, record) => {
    if (record === 0)
      return;
    it(`finishes a restore interrupted after record ${record} (${type.value}) of its journal and before what it names when the folder is next opened`, async t => {
      const { harness, prepared } = await StoppedRun.stopAsync(t, StopPoint.after(record));
      await harness.listAsync();

      assert.deepEqual(await harness.snapshotAsync(), prepared.saved);
      await RestoreFolder.of(harness).assertCleanAsync();
    });
  });

  const stopAroundMadeAsync = async (t: TestContext, stopAt: (made: number) => StopPoint): Promise<void> => {
    const run = await CheckpointsHarness.startAsync(t);
    const first = await PreparedRestore.prepareAsync(run);
    let journal: ScriptedJournal | undefined;
    await run.restoreAsync(await run.planAsync(first.checkpoint), await run.createServiceAsync(ServiceSeams.system.withJournals(file => journal = new ScriptedJournal(file, RestoreFolder.of(run).actionOf("loseAsides")))));
    const made = journal?.appended.findIndex(u => u.type === JournalRecordType.Made) ?? -1;
    assert.ok(made > 0);

    const { harness, now } = await StoppedRun.stopAsync(t, stopAt(made), "loseAsides");
    await harness.listAsync();

    assert.deepEqual(await harness.snapshotAsync(), now);
    await RestoreFolder.of(harness).assertCleanAsync();
  };

  it("finishes a rollback stopped just before it records a folder it makes again when the folder is next opened", async t => {
    await stopAroundMadeAsync(t, made => StopPoint.before(made));
  });

  it("finishes a rollback stopped just after it records a folder it makes again when the folder is next opened", async t => {
    await stopAroundMadeAsync(t, made => StopPoint.after(made));
  });

  const stopRollbackAsync = async (t: TestContext, stop: StopPoint): Promise<void> => {
    const { harness, now } = await StoppedRun.stopAsync(t, stop, "loseStageOnPlacing");
    await harness.listAsync();

    assert.deepEqual(await harness.snapshotAsync(), now);
    await RestoreFolder.of(harness).assertCleanAsync();
  };

  it("finishes a rollback interrupted just after it was recorded when the folder is next opened", async t => {
    await stopRollbackAsync(t, StopPoint.afterFirst(JournalRecordType.RollingBack));
  });

  it("finishes a rollback interrupted at the journal's removal when the folder is next opened", async t => {
    await stopRollbackAsync(t, StopPoint.atRemoval());
  });

  const stopAtCopyAsync = async (t: TestContext, type: JournalRecordType, action: string, restores: boolean): Promise<void> => {
    const run = await CheckpointsHarness.startAsync(t);
    const first = await PreparedRestore.prepareAsync(run);
    let journal: ScriptedJournal | undefined;
    await run.restoreAsync(await run.planAsync(first.checkpoint),
      await run.createServiceAsync(ServiceSeams.system.withJournals(file => journal = new ScriptedJournal(file, RestoreFolder.of(run).actionOf(action))).withoutHardLinks()));
    const at = journal?.appended.findLastIndex(u => u.type === type && !Object.isNull(u.step)) ?? -1;
    assert.ok(at > 0, type.value);

    const harness = await CheckpointsHarness.startAsync(t);
    const prepared = await PreparedRestore.prepareAsync(harness);
    const plan = await harness.planAsync(prepared.checkpoint);
    const now = await harness.snapshotAsync();

    await StoppedRestore.stopAsync(harness, plan, StopPoint.after(at), action, true);
    const stopped = (await RestoreFolder.of(harness).recordsAsync()).at(-1) ?? null;
    assert.equal(stopped?.type, type);
    const folder = RestoreFolder.of(harness);
    const copy = await lstat(folder.locationOf(RestoreFolder.presentOf((await folder.scriptAsync()).steps[RestoreFolder.presentOf(stopped?.step ?? null)]?.path ?? null)), { bigint: true });
    assert.deepEqual([RestorePaths.fileIdOf(copy), copy.size], [stopped?.fileId, 0n], type.value);
    await harness.listAsync();

    assert.deepEqual(await harness.snapshotAsync(), restores ? prepared.saved : now, type.value);
    await RestoreFolder.of(harness).assertCleanAsync();
  };

  it("makes again a copy a restore placed on a volume without hard links, when it stopped right after recording the copy", async t => {
    await stopAtCopyAsync(t, JournalRecordType.Placed, "none", true);
  });

  it("makes again a copy a rollback returned on a volume without hard links, when it stopped right after recording the copy", async t => {
    await stopAtCopyAsync(t, JournalRecordType.Returned, "loseStageOnPlaced", false);
  });

  it("makes again a copy a rollback made again from the checkpoint taken before the restore on a volume without hard links, when it stopped right after recording the copy", async t => {
    await stopAtCopyAsync(t, JournalRecordType.Made, "loseAsides", false);
  });

  it("leaves nothing a stopped restore started running once it ends what the stopped restore's processes recorded", async t => {
    const { started } = await StoppedRun.stopAsync(t, StopPoint.before(1));
    const presence = ProcessPresence.create(process.platform);

    assert.notDeepEqual(started, []);
    assert.deepEqual(await Promise.all(started.map(async u => await presence.isRunningAsync(u))), started.map(() => false));
  });
});
