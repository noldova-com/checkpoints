/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { randomBytes } from "node:crypto";
import { mkdir, readFile, rm } from "node:fs/promises";

import "@noldova/context.core";
import {
  CaptureOutcome,
  PathKind,
  RestoreAction,
  RestoreHeldUpEvent,
  RestoreOutcome,
  RestoreResult,
  RestoredEvent,
  type Checkpoint,
  type RestoreRequest
} from "@noldova/checkpoints.protocol";
import type { EventChannel, IModuleLog } from "@noldova/desktop.runtime";

import { DepthOrder } from "../models/depth-order.ts";
import { FinishedRestore } from "../models/finished-restore.ts";
import { FolderIndex } from "../models/folder-index.ts";
import type { FolderStore } from "../models/folder-store.ts";
import type { IndexEntry } from "../models/index-entry.ts";
import { JournalRecordType } from "../models/journal-record-type.ts";
import { JournalRecord } from "../models/journal-record.ts";
import { NoPlan } from "../models/no-plan.ts";
import type { PlannedRestore } from "../models/planned-restore.ts";
import { RestoreRun } from "../models/restore-run.ts";
import { RestoreScript } from "../models/restore-script.ts";
import { ScriptStep } from "../models/script-step.ts";
import { SideFile } from "../models/side-file.ts";
import { SideFolder } from "../models/side-folder.ts";
import { StagedBlob } from "../models/staged-blob.ts";
import { Resources } from "../resources.ts";
import type { BlobStager } from "./blob-stager.ts";
import type { CheckpointCapture } from "./checkpoint-capture.ts";
import { Failures } from "./failures.ts";
import type { FreeSpace } from "./free-space.ts";
import { PathGuard } from "./path-guard.ts";
import { RelativePath } from "./relative-path.ts";
import { RestoreScope } from "./restore-scope.ts";
import { RestoreApplier } from "./restore-applier.ts";
import type { RestoreJournal } from "./restore-journal.ts";
import { RestorePaths } from "./restore-paths.ts";
import type { RestorePlanner } from "./restore-planner.ts";
import type { RestoreRollback } from "./restore-rollback.ts";
import { StoreFile } from "./store-file.ts";

export class RestoreRunner {
  private readonly applier: RestoreApplier;
  private readonly capture: CheckpointCapture;
  private readonly hasRoomAsync: typeof FreeSpace.hasRoomAsync;
  private readonly heldUp: EventChannel;
  private readonly journals: (file: string) => RestoreJournal;
  private readonly log: IModuleLog;
  private readonly planner: RestorePlanner;
  private readonly restored: EventChannel;
  private readonly rollback: RestoreRollback;
  private readonly stager: BlobStager;

  public constructor(
    planner: RestorePlanner,
    capture: CheckpointCapture,
    stager: BlobStager,
    applier: RestoreApplier,
    rollback: RestoreRollback,
    restored: EventChannel,
    heldUp: EventChannel,
    log: IModuleLog,
    journals: (file: string) => RestoreJournal,
    hasRoomAsync: typeof FreeSpace.hasRoomAsync) {
    this.applier = applier;
    this.capture = capture;
    this.hasRoomAsync = hasRoomAsync;
    this.heldUp = heldUp;
    this.journals = journals;
    this.log = log;
    this.planner = planner;
    this.restored = restored;
    this.rollback = rollback;
    this.stager = stager;
  }

  public async restoreAsync(store: FolderStore, request: RestoreRequest, signal: AbortSignal): Promise<RestoreResult> {
    if (!await this.recoverAsync(store, request.folder.identity, request.folder.path))
      return new RestoreResult(RestoreOutcome.HeldUp, null, null);
    const planned = await this.planner.planAsync(store, request.folder, request.plan.checkpoint, request.plan.paths, signal);
    if (planned instanceof NoPlan)
      return new RestoreResult(planned.restore, null, null);
    if (planned.plan.state !== request.plan.state)
      return new RestoreResult(RestoreOutcome.MovedOn, null, null);
    if (!await this.hasRoomAsync(request.folder.path, store.folder, planned.plan.bytesToWrite, planned.plan.spaceNeeded - planned.plan.bytesToWrite))
      return new RestoreResult(RestoreOutcome.LowDiskSpace, null, null);

    const captured = await this.capture.captureAsync(store, request.folder.path, Resources.beforeRestoreLabel, planned.record.checkpoint.mode, null, signal);
    if (captured.outcome === CaptureOutcome.LowDiskSpace)
      return new RestoreResult(RestoreOutcome.LowDiskSpace, null, null);
    if (captured.outcome === CaptureOutcome.TooLarge)
      return new RestoreResult(RestoreOutcome.TooLarge, null, null, captured.contentSize, captured.contentLimit);
    if (Object.isNull(captured.checkpoint))
      return new RestoreResult(RestoreOutcome.FolderMissing, null, null);
    const before = captured.checkpoint;
    const index = await RestoreRunner.readIndexAsync(store);
    if (!RestoreRunner.matchesBefore(planned, before, index))
      return new RestoreResult(RestoreOutcome.MovedOn, null, null);

    signal.throwIfAborted();
    const script = RestoreRunner.scriptOf(planned, before);
    const journal = this.journals(store.restoreFile);
    await journal.createAsync(script);
    const run = new RestoreRun(store, request.folder.path, script, journal, new PathGuard(request.folder.path, script.folders), index);
    try {
      await mkdir(run.locationOf(script.staging));
      await this.stager.stageAsync(store, script.steps.filter(t => !Object.isNull(t.stage)).map(t =>
        new StagedBlob(t.readObjectId(), run.locationOf(t.readStage()), t.readKind(), t.linkKind)));
      await journal.appendAsync(JournalRecord.Applying);
    }
    catch (error) {
      this.log.write(Resources.formatRestoreFailed(request.folder.identity, Failures.messageOf(error)));
      return await this.discardAsync(run, request.folder.identity) ? new RestoreResult(RestoreOutcome.RolledBack, before, null)
        : new RestoreResult(RestoreOutcome.HeldUp, null, null);
    }
    const finished = await this.finishAsync(run, request.folder.identity, journal.records);
    return new RestoreResult(finished.outcome, finished.outcome === RestoreOutcome.HeldUp ? null : before, finished.recovered);
  }

  public async recoverAsync(store: FolderStore, identity: string, folder: string): Promise<boolean> {
    const journal = this.journals(store.restoreFile);
    const reading = await journal.readAsync();
    if (Object.isNull(reading))
      return true;
    const script = reading.script;
    if (Object.isNull(script)) {
      this.log.write(Resources.formatJournalUnreadable(identity));
      this.heldUp.publish(new RestoreHeldUpEvent(identity, []).toJson());
      return false;
    }
    const run = new RestoreRun(store, folder, script, journal, new PathGuard(folder, script.folders), await RestoreRunner.readIndexAsync(store));
    if (!reading.records.some(t => t.type === JournalRecordType.Applying))
      return await this.discardAsync(run, identity);
    return (await this.finishAsync(run, identity, reading.records)).isClosed;
  }

  private async finishAsync(run: RestoreRun, identity: string, records: readonly JournalRecord[]): Promise<FinishedRestore> {
    let read = records;
    if (!read.some(t => t.type === JournalRecordType.RollingBack) && !read.some(t => t.type === JournalRecordType.Cleaning)) {
      try {
        await this.applier.applyAsync(run, read);
        await RestoreApplier.flushAsync(run);
        await run.journal.appendAsync(JournalRecord.Cleaning);
      }
      catch (error) {
        this.log.write(Resources.formatRestoreFailed(identity, Failures.messageOf(error)));
      }
      read = run.journal.records;
    }
    if (!read.some(t => t.type === JournalRecordType.RollingBack) && read.some(t => t.type === JournalRecordType.Cleaning)) {
      const cleaned = await this.cleanUpAsync(run, identity, read);
      if (!Object.isNull(cleaned))
        return cleaned;
    }
    const failed = await this.rollback.rollBackAsync(run, read);
    if (failed.length === 0)
      return new FinishedRestore(RestoreOutcome.RolledBack, null, true);
    this.heldUp.publish(new RestoreHeldUpEvent(identity, failed).toJson());
    return new FinishedRestore(RestoreOutcome.HeldUp, null, false);
  }

  private async cleanUpAsync(run: RestoreRun, identity: string, records: readonly JournalRecord[]): Promise<FinishedRestore | null> {
    let recovered: Checkpoint | null = null;
    try {
      const changed = await this.applier.findChangedAsync(run);
      if (Object.isNull(changed)) {
        this.log.write(Resources.formatRestoreFailed(identity, Resources.repositoryReason));
        return null;
      }
      if (changed.length > 0)
        recovered = await this.capture.captureMovedAsync(run.store, changed, Resources.recoveredLabel, await this.keepingIdAsync(run, records));
      await RestoreApplier.removeAsideAsync(run);
    }
    catch (error) {
      this.log.write(Resources.formatCleanupFailed(identity, Failures.messageOf(error)));
      this.heldUp.publish(new RestoreHeldUpEvent(identity, [run.script.staging]).toJson());
      return new FinishedRestore(RestoreOutcome.Restored, recovered, false);
    }
    await run.journal.removeAsync();
    this.restored.publish(new RestoredEvent(identity, run.script.checkpoint, run.script.before).toJson());
    return new FinishedRestore(RestoreOutcome.Restored, recovered, true);
  }

  private async keepingIdAsync(run: RestoreRun, records: readonly JournalRecord[]): Promise<string> {
    const keeping = records.find(t => t.type === JournalRecordType.Keeping);
    if (!Object.isUndefined(keeping))
      return keeping.readCheckpoint();
    const id = this.capture.newId();
    await run.journal.appendAsync(JournalRecord.keeping(id));
    return id;
  }

  private async discardAsync(run: RestoreRun, identity: string): Promise<boolean> {
    try {
      await RestorePaths.retryAsync(run.script.staging, () => rm(run.locationOf(run.script.staging), { recursive: true, force: true }));
    }
    catch (error) {
      this.log.write(Resources.formatDiscardFailed(identity, Failures.messageOf(error)));
      this.heldUp.publish(new RestoreHeldUpEvent(identity, [run.script.staging]).toJson());
      return false;
    }
    await run.journal.removeAsync();
    return true;
  }

  private static matchesBefore(planned: PlannedRestore, before: Checkpoint, index: ReadonlyMap<string, IndexEntry>): boolean {
    for (const change of planned.changes) {
      const file = change.before;
      if (Object.isNull(file) || file instanceof SideFolder)
        continue;
      const entry = index.get(change.path);
      if (Object.isUndefined(entry) || entry.objectId !== file.objectId || entry.fileId !== file.fileId)
        return false;
    }
    const isWithin = (path: string, folder: string): boolean => path === folder || path.startsWith(`${folder}${Resources.relativePathSeparator}`);
    return !before.unreadPaths.some(t => planned.changes.some(u => isWithin(u.path, t.path) || isWithin(t.path, u.path)));
  }

  private static async readIndexAsync(store: FolderStore): Promise<ReadonlyMap<string, IndexEntry>> {
    const index = StoreFile.parse(Resources.indexFile, await readFile(store.indexFile, Resources.utf8Encoding), t => FolderIndex.fromJson(t));
    return new Map(index.entries.map(t => [t.path, t]));
  }

  private static scriptOf(planned: PlannedRestore, before: Checkpoint): RestoreScript {
    const restoreId = randomBytes(Resources.restoreIdBytes).toString(Resources.hexEncoding);
    const staging = `${Resources.stagingPrefix}${restoreId}`;
    const walk = planned.walk;
    const steps = planned.plan.steps.map((t, u) => {
      const after = planned.changes[u]?.after ?? null;
      const stage = !Object.isNull(after) && after.kind !== PathKind.Folder ? RelativePath.join(staging, String(u)) : null;
      const aside = t.action === RestoreAction.Write ? null : RelativePath.join(staging, `${u}${Resources.asideSuffix}`);
      return new ScriptStep(u, t.path, t.action, stage, aside, after?.kind ?? null, after instanceof SideFile ? after.objectId : null, planned.record.linkKindOf(t.path));
    });
    const moved = new Set(steps.filter(t => !Object.isNull(t.aside)).map(t => t.path));

    const needed = new Set<string>();
    for (const step of steps.filter(t => !Object.isNull(t.kind))) {
      if (step.kind === PathKind.Folder)
        needed.add(step.path);
      for (let folder = RelativePath.parentOf(step.path); folder !== ""; folder = RelativePath.parentOf(folder))
        needed.add(folder);
    }
    const create = [...needed].filter(t => !walk.folderIds.has(t) || moved.has(t));

    const kept = new Set<string>();
    for (const stay of planned.plan.stays)
      for (let folder = stay.path; folder !== ""; folder = RelativePath.parentOf(folder))
        kept.add(folder);
    const scope = new RestoreScope(planned.plan.paths);
    const remove = [...walk.folderIds.keys()].filter(t => t !== "" && planned.saved.entryOf(t)?.kind !== PathKind.Folder && !moved.has(t) && !kept.has(t)
      && scope.mayRemove(t, walk));

    const guarded = new Set<string>(["", ...remove]);
    for (const step of steps) {
      if (walk.folderIds.has(step.path))
        guarded.add(step.path);
      for (let folder = RelativePath.parentOf(step.path); folder !== ""; folder = RelativePath.parentOf(folder))
        guarded.add(folder);
    }
    const folders = new Map([...guarded].flatMap(t => {
      const fileId = walk.folderIds.get(t);
      return Object.isUndefined(fileId) ? [] : [[t, fileId] as const];
    }));
    return new RestoreScript(restoreId, planned.plan.checkpoint, before.id, steps, DepthOrder.ShallowestFirst.sort(create), DepthOrder.DeepestFirst.sort(remove), folders);
  }
}
