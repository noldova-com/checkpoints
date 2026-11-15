/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { mkdir, rename, rm, rmdir, unlink, type link } from "node:fs/promises";
import path from "node:path";

import type { IModuleLog } from "@noldova/desktop.runtime";

import { RestorePathOccupiedException } from "../exceptions/restore-path-occupied.exception.ts";
import { StagedFileMissingException } from "../exceptions/staged-file-missing.exception.ts";
import { JournalRecordType } from "../models/journal-record-type.ts";
import { JournalRecord } from "../models/journal-record.ts";
import type { RestoreRun } from "../models/restore-run.ts";
import type { ScriptStep } from "../models/script-step.ts";
import { SideFile } from "../models/side-file.ts";
import { StagedBlob } from "../models/staged-blob.ts";
import { StagedStep } from "../models/staged-step.ts";
import { Resources } from "../resources.ts";
import type { BlobStager } from "./blob-stager.ts";
import { Failures } from "./failures.ts";
import { RestoreApplier } from "./restore-applier.ts";
import { RestorePaths } from "./restore-paths.ts";
import type { SideLoader } from "./side-loader.ts";

export class RestoreRollback {
  private readonly hardLinkAsync: typeof link;
  private readonly loader: SideLoader;
  private readonly log: IModuleLog;
  private readonly stager: BlobStager;

  public constructor(loader: SideLoader, stager: BlobStager, log: IModuleLog, hardLinkAsync: typeof link) {
    this.hardLinkAsync = hardLinkAsync;
    this.loader = loader;
    this.log = log;
    this.stager = stager;
  }

  public async rollBackAsync(run: RestoreRun, records: readonly JournalRecord[]): Promise<readonly string[]> {
    if (!records.some(t => t.type === JournalRecordType.RollingBack))
      await run.journal.appendAsync(JournalRecord.RollingBack);
    const failed: string[] = [];
    const missing: ScriptStep[] = [];
    for (const record of records.filter(t => t.type === JournalRecordType.Made && t.path !== null))
      await this.attemptAsync(run, record.readPath(), failed, async () => {
        if (RestorePaths.isFolder(await RestorePaths.lstatAsync(run.locationOf(record.readPath()))))
          await run.guard.renewAsync(record.readPath());
      });
    for (const record of [...records].reverse()) {
      const at = record.path ?? run.script.steps[record.step ?? Resources.noStepIndex]?.path ?? "";
      await this.attemptAsync(run, at, failed, () => this.undoAsync(run, record, records, missing));
    }
    failed.push(...await this.restoreMissingAsync(run, missing, records));
    if (failed.length === 0)
      await this.attemptAsync(run, run.script.staging, failed, () => RestoreApplier.removeAsideAsync(run));
    if (failed.length > 0)
      return [...new Set(failed)];
    await run.journal.removeAsync();
    return [];
  }

  private async attemptAsync(run: RestoreRun, at: string, failed: string[], undo: () => Promise<void>): Promise<void> {
    try {
      await undo();
    }
    catch (error) {
      this.log.write(Resources.formatUndoFailed(RestoreRollback.identityOf(run), at, Failures.messageOf(error)));
      failed.push(at);
    }
  }

  private async undoAsync(run: RestoreRun, record: JournalRecord, records: readonly JournalRecord[], missing: ScriptStep[]): Promise<void> {
    if (record.type === JournalRecordType.Placing || record.type === JournalRecordType.Placed) {
      const step = run.script.stepAt(record.readStep());
      const there = await RestorePaths.lstatAsync(run.locationOf(step.path));
      if (there !== null && RestorePaths.fileIdOf(there) === record.fileId) {
        await run.guard.checkAsync(step.path);
        await RestorePaths.retryAsync(step.path, () => unlink(run.locationOf(step.path)));
      }
    }
    else if (record.type === JournalRecordType.Renamed) {
      const target = run.locationOf(record.readPath());
      if (RestorePaths.isFolder(await RestorePaths.lstatAsync(target)) && await RestorePaths.hasExactNameAsync(target)) {
        await run.guard.checkAsync(record.readPath());
        await RestorePaths.retryAsync(record.readPath(), () => rename(target, run.locationOf(record.readFrom())));
      }
    }
    else if (record.type === JournalRecordType.Created) {
      const target = run.locationOf(record.readPath());
      if (await RestorePaths.isEmptyFolderAsync(target) && await RestorePaths.hasExactNameAsync(target)) {
        await run.guard.checkAsync(record.readPath());
        await RestorePaths.retryAsync(record.readPath(), () => rmdir(target));
      }
    }
    else if (record.type === JournalRecordType.Removing) {
      if (await RestorePaths.lstatAsync(run.locationOf(record.readPath())) === null)
        await RestoreRollback.makeFolderAsync(run, record.readPath());
    }
    else if (record.type === JournalRecordType.Aside)
      await this.moveBackAsync(run, run.script.stepAt(record.readStep()), records, missing);
  }

  private static identityOf(run: RestoreRun): string {
    return path.basename(run.store.folder);
  }

  private notStaged(run: RestoreRun, reason: string): null {
    this.log.write(Resources.formatMissingNotStaged(RestoreRollback.identityOf(run), reason));
    return null;
  }

  private static copyIdsOf(records: readonly JournalRecord[], type: JournalRecordType, step: number): readonly (string | null)[] {
    return records.filter(t => t.type === type && t.step === step).map(t => t.fileId);
  }

  private async placeBackAsync(run: RestoreRun, step: ScriptStep, from: string, type: JournalRecordType, records: readonly JournalRecord[]): Promise<void> {
    const moving = await RestorePaths.lstatAsync(from);
    if (moving === null)
      throw new StagedFileMissingException(step.path);
    await run.guard.checkAsync(step.path);
    await RestorePaths.placeAsync(step.path, from, moving, run.locationOf(step.path), RestorePathOccupiedException,
      copy => run.journal.appendAsync(JournalRecord.ofFile(type, step.index, RestorePaths.fileIdOf(copy))), this.hardLinkAsync, RestoreRollback.copyIdsOf(records, type, step.index));
    await run.guard.checkAsync(step.path);
  }

  private static async makeFolderAsync(run: RestoreRun, relativePath: string): Promise<void> {
    await run.journal.appendAsync(JournalRecord.ofPath(JournalRecordType.Made, relativePath));
    await run.guard.checkAsync(relativePath);
    await RestorePaths.retryAsync(relativePath, () => mkdir(run.locationOf(relativePath)));
    await run.guard.renewAsync(relativePath);
  }

  private async moveBackAsync(run: RestoreRun, step: ScriptStep, records: readonly JournalRecord[], missing: ScriptStep[]): Promise<void> {
    const aside = run.locationOf(step.readAside());
    const there = await RestorePaths.lstatAsync(run.locationOf(step.path));
    if (await RestorePaths.lstatAsync(aside) === null) {
      if (there === null && run.script.folders.has(step.path))
        await RestoreRollback.makeFolderAsync(run, step.path);
      else if (there === null || RestoreRollback.copyIdsOf(records, JournalRecordType.Made, step.index).includes(RestorePaths.fileIdOf(there)))
        missing.push(step);
      return;
    }
    await this.placeBackAsync(run, step, aside, JournalRecordType.Returned, records);
  }

  private async restoreMissingAsync(run: RestoreRun, missing: readonly ScriptStep[], records: readonly JournalRecord[]): Promise<readonly string[]> {
    if (missing.length === 0)
      return [];
    const staged = await this.stageMissingAsync(run, missing).catch((error: unknown) => this.notStaged(run, Failures.messageOf(error)));
    if (staged === null)
      return missing.map(t => t.path);
    const failed: string[] = [];
    for (const { step, blob } of staged)
      await this.attemptAsync(run, step.path, failed, () => this.placeBackAsync(run, step, blob.location, JournalRecordType.Made, records));
    return failed;
  }

  private async stageMissingAsync(run: RestoreRun, missing: readonly ScriptStep[]): Promise<readonly StagedStep[] | null> {
    const loaded = await this.loader.loadCheckpointAsync(run.store, run.script.before, Resources.neverCancelled);
    if (loaded === null)
      return this.notStaged(run, Resources.beforeMissingReason);
    const { record, listing: before } = loaded;
    const staged: StagedStep[] = [];
    for (const step of missing) {
      const file = before.entryOf(step.path);
      if (!(file instanceof SideFile))
        return this.notStaged(run, Resources.formatNoContentReason(step.path));
      staged.push(new StagedStep(step, new StagedBlob(file.objectId, run.locationOf(`${step.readAside()}${Resources.temporarySuffix}`), file.kind, record.linkKindOf(step.path))));
    }
    const blobs = staged.map(t => t.blob);
    await mkdir(run.locationOf(run.script.staging), { recursive: true });
    await Promise.all(blobs.map(t => rm(t.location, { force: true })));
    await this.stager.stageAsync(run.store, blobs);
    return staged;
  }
}
