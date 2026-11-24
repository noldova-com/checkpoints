/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { access, stat } from "node:fs/promises";

import "@noldova/context.core";
import {
  ChangeStatus,
  KeepReason,
  KeptPath,
  PathKind,
  RestoreAction,
  RestorePlan,
  RestoreStep,
  UnreadReason,
  type Change,
  type FolderReference
} from "@noldova/checkpoints.protocol";

import type { FolderFile } from "../models/folder-file.ts";
import type { FolderStore } from "../models/folder-store.ts";
import { NoPlan } from "../models/no-plan.ts";
import type { PendingChange } from "../models/pending-change.ts";
import { PlannedRestore } from "../models/planned-restore.ts";
import type { SideFolder } from "../models/side-folder.ts";
import type { SideListing } from "../models/side-listing.ts";
import type { WalkResult } from "../models/walk-result.ts";
import { Resources } from "../resources.ts";
import type { ChangeDescriber } from "./change-describer.ts";
import { Failures } from "./failures.ts";
import { LinkProbe } from "./link-probe.ts";
import { ListingComparer } from "./listing-comparer.ts";
import { PlanState } from "./plan-state.ts";
import { RelativePath } from "./relative-path.ts";
import { RestoreScope } from "./restore-scope.ts";
import { RepositoryName } from "./repository-name.ts";
import type { SideLoader } from "./side-loader.ts";
import { StoreOpener } from "./store-opener.ts";

export class RestorePlanner {
  private readonly describer: ChangeDescriber;
  private readonly loader: SideLoader;

  public constructor(loader: SideLoader, describer: ChangeDescriber) {
    this.describer = describer;
    this.loader = loader;
  }

  public async planAsync(
    store: FolderStore, folder: FolderReference, checkpoint: string, paths: readonly string[] | null, signal: AbortSignal
  ): Promise<PlannedRestore | NoPlan> {
    if (await Failures.recoverAsync(access(store.restoreFile).then(() => true), t => Failures.isAbsent(t), false))
      return NoPlan.HeldUp;
    const loaded = await StoreOpener.existsAsync(store) ? await this.loader.loadCheckpointAsync(store, checkpoint, signal) : null;
    if (Object.isNull(loaded))
      return NoPlan.CheckpointMissing;
    if (!await Failures.recoverAsync(stat(folder.path).then(t => t.isDirectory()), t => Failures.isAbsent(t), false))
      return NoPlan.FolderMissing;

    const { record, listing: saved } = loaded;
    const walked = await this.loader.loadFolderWalkAsync(store, folder.path, record.checkpoint.mode, signal);
    if (Object.isNull(walked))
      return NoPlan.FolderMissing;
    const { listing: now, walk } = walked;
    const stays = RestorePlanner.findStays(now, saved, walk);
    const canLink = await LinkProbe.canCreateLinksAsync(store.folder);
    const scope = new RestoreScope(paths);
    const changes: PendingChange<FolderFile | SideFolder>[] = [];
    for (const change of ListingComparer.compare(now, saved).filter(t => scope.needs(t))) {
      const reason = RestorePlanner.keepReasonOf(change, saved, now, walk, canLink);
      if (Object.isNull(reason))
        changes.push(change);
      else if (!stays.has(change.path))
        stays.set(change.path, reason);
    }
    const planned = RestorePlanner.leaveStaysAlone(changes, stays);
    const steps = (await this.describer.describeAsync(store, folder.path, planned, signal)).map(t => RestorePlanner.stepOf(t));
    const kept = [...stays].filter(([t]) => !RestorePlanner.isUnderStay(t, stays) && scope.reports(t)).map(([t, u]) => new KeptPath(t, u));
    kept.sort((t, u) => Buffer.compare(Buffer.from(t.path), Buffer.from(u.path)));
    const earlier = new Set(record.earlierPaths);
    const plan = new RestorePlan(checkpoint, steps, kept, RestorePlanner.bytesToWrite(steps), RestorePlanner.spaceNeeded(steps), PlanState.digestOf(planned, walk), paths,
      steps.filter(t => earlier.has(t.path)).map(t => t.path));
    return new PlannedRestore(plan, record, planned, saved, walk);
  }

  private static bytesToWrite(steps: readonly RestoreStep[]): number {
    return steps.reduce((t, u) => t + (u.after?.size ?? 0), 0);
  }

  private static findStays(now: SideListing, saved: SideListing, walk: WalkResult): Map<string, KeepReason> {
    const stays = new Map<string, KeepReason>();
    for (const path of walk.repositoryPaths)
      stays.set(path, KeepReason.Repository);
    for (const path of walk.repositoryFolders)
      stays.set(path, KeepReason.RepositoryFolder);
    for (const path of walk.ignoredPaths)
      stays.set(path, KeepReason.Ignored);
    for (const [side, other] of [[now, saved], [saved, now]] as const)
      for (const path of side.paths)
        if (!stays.has(path) && other.excludes(path, side.entryOf(path)?.kind === PathKind.Folder))
          stays.set(path, KeepReason.Ignored);
    return stays;
  }

  private static isUnderStay(relativePath: string, stays: ReadonlyMap<string, KeepReason>): boolean {
    for (let folder = RelativePath.parentOf(relativePath); folder !== ""; folder = RelativePath.parentOf(folder)) {
      const reason = stays.get(folder);
      if (!Object.isUndefined(reason) && reason !== KeepReason.RepositoryFolder)
        return true;
    }
    return false;
  }

  private static keepReasonOf(change: PendingChange, saved: SideListing, now: SideListing, walk: WalkResult, canLink: boolean): KeepReason | null {
    if (change.status === ChangeStatus.Unknown)
      return [saved, now].some(t => t.unreadReasonOf(change.path) === UnreadReason.TooLarge) ? KeepReason.TooLarge : KeepReason.Unread;
    if (walk.repositoryFolders.has(change.path))
      return KeepReason.RepositoryFolder;
    if (change.path.split(Resources.relativePathSeparator).some(t => RepositoryName.matches(t)))
      return KeepReason.Repository;
    if ((change.after?.kind === PathKind.Link || change.before?.kind === PathKind.Link) && !canLink)
      return KeepReason.LinkUnsupported;
    return null;
  }

  private static leaveStaysAlone(changes: readonly PendingChange<FolderFile | SideFolder>[], stays: Map<string, KeepReason>): readonly PendingChange<FolderFile | SideFolder>[] {
    const above = new Map<string, KeepReason>();
    for (const [path, reason] of stays)
      for (let folder = RelativePath.parentOf(path); folder !== "" && !above.has(folder); folder = RelativePath.parentOf(folder))
        above.set(folder, reason);
    return changes.filter(t => {
      if (RestorePlanner.isUnderStay(t.path, stays))
        return false;
      const reason = t.before?.kind === PathKind.Folder ? above.get(t.path) : undefined;
      if (!Object.isUndefined(reason))
        stays.set(t.path, reason);
      return Object.isUndefined(reason);
    });
  }

  private static spaceNeeded(steps: readonly RestoreStep[]): number {
    return RestorePlanner.bytesToWrite(steps) + steps.reduce((t, u) => t + (u.before?.size ?? 0), 0);
  }

  private static stepOf(change: Change): RestoreStep {
    const action = change.status === ChangeStatus.Added ? RestoreAction.Write : change.status === ChangeStatus.Deleted ? RestoreAction.Delete : RestoreAction.Replace;
    return new RestoreStep(change.path, action, change.before, change.after);
  }
}
