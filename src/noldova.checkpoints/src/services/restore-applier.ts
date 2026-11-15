/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { BigIntStats } from "node:fs";
import { lstat, mkdir, rename, rm, rmdir, type link } from "node:fs/promises";

import { CaptureMode } from "@noldova/checkpoints.protocol";

import { RestorePathChangedException } from "../exceptions/restore-path-changed.exception.ts";
import { RestorePathInTheWayException } from "../exceptions/restore-path-in-the-way.exception.ts";
import { RestoreStepException } from "../exceptions/restore-step.exception.ts";
import { StagedFileMissingException } from "../exceptions/staged-file-missing.exception.ts";
import { EntryKind } from "../models/entry-kind.ts";
import type { IndexEntry } from "../models/index-entry.ts";
import { JournalRecordType } from "../models/journal-record-type.ts";
import { JournalRecord } from "../models/journal-record.ts";
import type { RestoreRun } from "../models/restore-run.ts";
import type { RestoreScript } from "../models/restore-script.ts";
import type { ScriptStep } from "../models/script-step.ts";
import { WalkedEntry } from "../models/walked-entry.ts";
import { Resources } from "../resources.ts";
import { Failures } from "./failures.ts";
import { FolderFileReader } from "./folder-file.reader.ts";
import type { FolderWalker } from "./folder-walker.ts";
import { RelativePath } from "./relative-path.ts";
import { RestoreJournal } from "./restore-journal.ts";
import { RestorePaths } from "./restore-paths.ts";

export class RestoreApplier {
  private readonly hardLinkAsync: typeof link;
  private readonly platform: string;
  private readonly walker: FolderWalker;

  public constructor(walker: FolderWalker, platform: string, hardLinkAsync: typeof link) {
    this.hardLinkAsync = hardLinkAsync;
    this.platform = platform;
    this.walker = walker;
  }

  public static actionsOf(script: RestoreScript): readonly JournalRecord[] {
    return [
      ...script.asideOrder.map(t => JournalRecord.ofStep(JournalRecordType.Aside, t.index)),
      ...script.create.map(t => JournalRecord.ofPath(JournalRecordType.Created, t)),
      ...script.steps.filter(t => t.stage !== null).map(t => JournalRecord.ofStep(JournalRecordType.Placing, t.index)),
      ...script.remove.map(t => JournalRecord.ofPath(JournalRecordType.Removing, t))
    ];
  }

  public async applyAsync(run: RestoreRun, records: readonly JournalRecord[]): Promise<void> {
    const actions = RestoreApplier.actionsOf(run.script);
    let start = 0;
    actions.forEach((t, u) => {
      if (records.some(v => v.isSameAs(t)))
        start = u;
    });
    for (const action of actions.slice(start)) {
      const recorded = records.find(t => t.isSameAs(action)) ?? null;
      if (action.type === JournalRecordType.Aside)
        await this.moveAsideAsync(run, RestoreApplier.stepOf(run, action), recorded === null);
      else if (action.type === JournalRecordType.Created)
        await RestoreApplier.createAsync(run, action.readPath(), recorded === null);
      else if (action.type === JournalRecordType.Placing)
        await this.placeAsync(run, RestoreApplier.stepOf(run, action), records);
      else
        await RestoreApplier.removeAsync(run, action.readPath(), recorded === null);
    }
  }

  public async findChangedAsync(run: RestoreRun): Promise<readonly WalkedEntry[] | null> {
    const changed: WalkedEntry[] = [];
    for (const step of run.script.asideOrder) {
      const location = run.locationOf(step.readAside());
      const stats = await RestorePaths.lstatAsync(location);
      if (stats === null)
        continue;
      if (RestorePaths.isFolder(stats)) {
        const walk = await this.walker.walkAsync(location, CaptureMode.EveryFile, Resources.neverCancelled);
        if (walk.repositoryPaths.length > 0)
          return null;
        for (const entry of walk.entries)
          changed.push(new WalkedEntry(RelativePath.join(step.path, entry.path), entry.location, entry.kind, await lstat(entry.location, { bigint: true })));
        continue;
      }
      const kind = EntryKind.ofStats(this.platform, stats);
      if (kind !== null && !this.isAsBefore(run, step, stats))
        changed.push(new WalkedEntry(step.path, location, kind, stats));
    }
    return changed;
  }

  public static async flushAsync(run: RestoreRun): Promise<void> {
    const folders = new Set<string>(["", run.script.staging]);
    for (const changed of [...run.script.steps.map(t => t.path), ...run.script.create, ...run.script.remove])
      folders.add(RelativePath.parentOf(changed));
    for (const folder of run.script.create)
      folders.add(folder);
    for (const folder of folders)
      if (RestorePaths.isFolder(await RestorePaths.lstatAsync(run.locationOf(folder))))
        await RestoreJournal.syncFolderAsync(run.locationOf(folder));
  }

  public static async removeAsideAsync(run: RestoreRun): Promise<void> {
    for (const step of run.script.asideOrder)
      await RestorePaths.retryAsync(step.path, () => rm(run.locationOf(step.readAside()), { recursive: true, force: true }));
    await RestorePaths.retryAsync(run.script.staging, () => rm(run.locationOf(run.script.staging), { recursive: true, force: true }));
  }

  private static stepOf(run: RestoreRun, record: JournalRecord): ScriptStep {
    return run.script.stepAt(record.readStep());
  }

  private isAsBefore(run: RestoreRun, step: ScriptStep, stats: BigIntStats | null): boolean {
    if (stats !== null && RestorePaths.isFolder(stats))
      return run.script.folders.get(step.path) === RestorePaths.fileIdOf(stats);
    const entry = run.index.get(step.path);
    return stats !== null && entry !== undefined && EntryKind.ofStats(this.platform, stats) === entry.kind &&
      Number(stats.size) === entry.size && stats.mtimeNs === entry.modified && RestorePaths.fileIdOf(stats) === entry.fileId;
  }

  private static async holdsAsBeforeAsync(step: ScriptStep, location: string, entry: IndexEntry): Promise<boolean> {
    const objectId = await Failures.recoverAsync(RestorePaths.retryAsync(step.path, () => FolderFileReader.objectIdOfAsync(location, entry.kind === EntryKind.Link)),
      t => t instanceof RestoreStepException, null);
    return objectId === entry.objectId;
  }

  private async moveAsideAsync(run: RestoreRun, step: ScriptStep, isNew: boolean): Promise<void> {
    if (isNew)
      await run.journal.appendAsync(JournalRecord.ofStep(JournalRecordType.Aside, step.index));
    const target = run.locationOf(step.path);
    const aside = run.locationOf(step.readAside());
    if (await RestorePaths.lstatAsync(aside) === null) {
      if (await RestorePaths.lstatAsync(target) === null)
        return;
      await run.guard.checkAsync(step.path);
      await RestorePaths.retryAsync(step.path, () => rename(target, aside));
      await run.guard.checkAsync(step.path);
    }
    const stats = await RestorePaths.lstatAsync(aside);
    const entry = run.index.get(step.path);
    if (!this.isAsBefore(run, step, stats) || !RestorePaths.isFolder(stats) && (entry === undefined || !await RestoreApplier.holdsAsBeforeAsync(step, aside, entry)))
      throw new RestorePathChangedException(step.path);
  }

  private static async createAsync(run: RestoreRun, relativePath: string, isNew: boolean): Promise<void> {
    if (isNew)
      await run.journal.appendAsync(JournalRecord.ofPath(JournalRecordType.Created, relativePath));
    const target = run.locationOf(relativePath);
    const twin = run.script.remove.find(t => t !== relativePath && t.toLowerCase() === relativePath.toLowerCase());
    if (twin !== undefined && await RestorePaths.isEmptyFolderAsync(run.locationOf(twin))) {
      await run.journal.appendAsync(JournalRecord.renamed(relativePath, twin));
      await run.guard.checkAsync(relativePath);
      await RestorePaths.retryAsync(relativePath, () => rename(run.locationOf(twin), target));
      await run.guard.checkAsync(relativePath);
      return;
    }
    if (RestorePaths.isFolder(await RestorePaths.lstatAsync(target)))
      return;
    await run.guard.checkAsync(relativePath);
    await RestorePaths.retryAsync(relativePath, () => mkdir(target));
    await run.guard.checkFolderAsync(relativePath);
  }

  private async placeAsync(run: RestoreRun, step: ScriptStep, records: readonly JournalRecord[]): Promise<void> {
    const ids = RestoreApplier.placedIdsOf(records, step.index);
    const stage = run.locationOf(step.readStage());
    const target = run.locationOf(step.path);
    const staged = await RestorePaths.lstatAsync(stage);
    if (staged === null) {
      const there = await RestorePaths.lstatAsync(target);
      if (there !== null && ids.includes(RestorePaths.fileIdOf(there)))
        return;
      throw new StagedFileMissingException(step.path);
    }
    if (ids.length === 0)
      await run.journal.appendAsync(JournalRecord.ofFile(JournalRecordType.Placing, step.index, RestorePaths.fileIdOf(staged)));
    await run.guard.checkAsync(step.path);
    await RestorePaths.placeAsync(step.path, stage, staged, target, RestorePathInTheWayException,
      async copy => await run.journal.appendAsync(JournalRecord.ofFile(JournalRecordType.Placed, step.index, RestorePaths.fileIdOf(copy))), this.hardLinkAsync, ids);
    await run.guard.checkAsync(step.path);
  }

  private static placedIdsOf(records: readonly JournalRecord[], step: number): readonly (string | null)[] {
    return records.filter(t => t.step === step && (t.type === JournalRecordType.Placing || t.type === JournalRecordType.Placed)).map(t => t.fileId);
  }

  private static async removeAsync(run: RestoreRun, relativePath: string, isNew: boolean): Promise<void> {
    if (isNew)
      await run.journal.appendAsync(JournalRecord.ofPath(JournalRecordType.Removing, relativePath));
    const target = run.locationOf(relativePath);
    if (!await RestorePaths.isEmptyFolderAsync(target) || !await RestorePaths.hasExactNameAsync(target))
      return;
    await run.guard.checkAsync(relativePath);
    await RestorePaths.retryAsync(relativePath, () => rmdir(target));
  }
}
