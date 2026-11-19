/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { RmOptions } from "node:fs";
import { readdir, type link } from "node:fs/promises";

import {
  CaptureMode,
  CaptureOutcome,
  CaptureResult,
  CheckpointList,
  DeleteFolderOutcome,
  DeleteFolderResult,
  PreviewOutcome,
  PreviewResult,
  type CaptureRequest,
  type CompareRequest,
  type CompareResult,
  type DeleteFolderRequest,
  type ListRequest,
  type PreviewRequest,
  type ReadRequest,
  type ReadResult,
  type RestoreRequest,
  type RestoreResult,
  type StorageList
} from "@noldova/checkpoints.protocol";
import type { EventChannel, IModuleLog, IModuleSettings, IRuntimePartContext } from "@noldova/desktop.runtime";

import { FolderStore } from "../models/folder-store.ts";
import type { GitBuild } from "../models/git-build.ts";
import { GitLimits } from "../models/git-limits.ts";
import { NoPlan } from "../models/no-plan.ts";
import { Resources } from "../resources.ts";
import { BlobStager } from "./blob-stager.ts";
import { CapturePause } from "./capture-pause.ts";
import { ChangeDescriber } from "./change-describer.ts";
import { CheckpointCapture } from "./checkpoint-capture.ts";
import { CheckpointComparer } from "./checkpoint-comparer.ts";
import { CheckpointFileReader } from "./checkpoint-file.reader.ts";
import { CheckpointIdSource } from "./checkpoint-id-source.ts";
import { CheckpointLister } from "./checkpoint-lister.ts";
import { CheckpointsService } from "./checkpoints.service.ts";
import type { Clock } from "./clock.ts";
import { EntryReader } from "./entry.reader.ts";
import { Failures } from "./failures.ts";
import { FolderDeleter } from "./folder-deleter.ts";
import { FolderQueue } from "./folder-queue.ts";
import { FolderWalker } from "./folder-walker.ts";
import type { FreeSpace } from "./free-space.ts";
import { GitRunner } from "./git-runner.ts";
import { HousekeepingSchedule } from "./housekeeping-schedule.ts";
import { ObjectReader } from "./object.reader.ts";
import { RestoreApplier } from "./restore-applier.ts";
import type { RestoreJournal } from "./restore-journal.ts";
import { RestorePlanner } from "./restore-planner.ts";
import { RestoreRollback } from "./restore-rollback.ts";
import { RestoreRunner } from "./restore-runner.ts";
import { SideLoader } from "./side-loader.ts";
import { StorageReader } from "./storage-reader.ts";
import { StoreHousekeeping } from "./store-housekeeping.ts";
import { StoreOpener } from "./store-opener.ts";
import { StoreReads } from "./store-reads.ts";
import { TreeLister } from "./tree-lister.ts";

export class CheckpointsHost extends CheckpointsService {
  private readonly capture: CheckpointCapture;
  private readonly pause: CapturePause;
  private readonly comparer: CheckpointComparer;
  private readonly deleter: FolderDeleter;
  private readonly fileReader: CheckpointFileReader;
  private readonly git: GitRunner;
  private readonly lister: CheckpointLister;
  private readonly log: IModuleLog;
  private readonly moduleFolder: string;
  private readonly operations: Set<Promise<unknown>> = new Set();
  private readonly planner: RestorePlanner;
  private readonly queue: FolderQueue = new FolderQueue();
  private readonly runner: RestoreRunner;
  private readonly schedule: HousekeepingSchedule;
  private readonly settings: IModuleSettings;
  private readonly stopping: AbortController = new AbortController();
  private readonly storage: StorageReader;
  private starting: Promise<void> = Promise.resolve();
  private sweeping: Promise<void> = Promise.resolve();

  public constructor(
    context: IRuntimePartContext,
    build: GitBuild,
    platform: string,
    restored: EventChannel,
    heldUp: EventChannel,
    paused: EventChannel,
    resumed: EventChannel,
    journals: (file: string) => RestoreJournal,
    hasRoomAsync: typeof FreeSpace.hasRoomAsync,
    hardLinkAsync: typeof link,
    readFreeAsync: typeof FreeSpace.readAsync,
    renameFolderAsync: (from: string, to: string) => Promise<void>,
    removeFolderAsync: (folder: string, options: RmOptions) => Promise<void>,
    statFileAsync: (file: string) => Promise<{ readonly size: number }>,
    clock: Clock) {
    super();
    const git = new GitRunner(context, build,
      new GitLimits(Resources.methodTimeoutMilliseconds, Resources.batchIdleMilliseconds, Resources.processIdleDelay, Resources.processStopMilliseconds), clock);
    this.git = git;
    this.log = context.log;
    const walker = new FolderWalker(platform);
    const objects = new ObjectReader(git);
    const loader = new SideLoader(objects, new TreeLister(git), walker, new EntryReader(platform));
    this.lister = new CheckpointLister(git);
    this.capture = new CheckpointCapture(git, new StoreOpener(git), walker, this.lister, new CheckpointIdSource(clock), platform, readFreeAsync, clock);
    this.pause = new CapturePause(context, paused, resumed);
    const stager = new BlobStager(git);
    const describer = new ChangeDescriber(objects);
    this.comparer = new CheckpointComparer(loader, describer);
    this.planner = new RestorePlanner(loader, describer);
    this.runner = new RestoreRunner(this.planner, this.capture, stager, new RestoreApplier(walker, platform, hardLinkAsync), new RestoreRollback(loader, stager, context.log, hardLinkAsync), restored, heldUp,
      context.log, journals, hasRoomAsync);
    const reads = new StoreReads();
    this.deleter = new FolderDeleter(context.moduleFolder, context.log, renameFolderAsync, removeFolderAsync, reads);
    this.storage = new StorageReader(t => readdir(t, { withFileTypes: true }), statFileAsync, reads);
    this.fileReader = new CheckpointFileReader(git, loader, objects, platform);
    this.moduleFolder = context.moduleFolder;
    this.schedule = new HousekeepingSchedule(this.queue, new StoreHousekeeping(git, readFreeAsync, clock), context.log, clock);
    this.settings = context.settings;
  }

  public override async captureAsync(request: CaptureRequest, signal: AbortSignal = Resources.neverCancelled): Promise<CaptureResult> {
    const store = new FolderStore(this.moduleFolder, request.folder.identity);
    return await this.runAsync(store, request.folder.identity, true, async stopped => {
      if (!await this.runner.recoverAsync(store, request.folder.identity, request.folder.path))
        return new CaptureResult(CaptureOutcome.HeldUp, null, null, null);
      const result = await this.capture.captureAsync(store, request.folder.path, request.label,
        this.settings.read(Resources.followIgnoreFilesSetting) === true ? CaptureMode.IgnoreFiles : CaptureMode.EveryFile, request.asOf, stopped);
      this.pause.report(request.folder.identity, result);
      return result;
    }, signal);
  }

  public override async compareAsync(request: CompareRequest, signal: AbortSignal = Resources.neverCancelled): Promise<CompareResult> {
    const store = new FolderStore(this.moduleFolder, request.folder.identity);
    return await this.runAsync(store, request.folder.identity, false, async stopped => {
      await this.runner.recoverAsync(store, request.folder.identity, request.folder.path);
      return await this.comparer.compareAsync(store, request, stopped);
    }, signal);
  }

  public override async deleteFolderAsync(request: DeleteFolderRequest, signal: AbortSignal = Resources.neverCancelled): Promise<DeleteFolderResult> {
    const store = new FolderStore(this.moduleFolder, request.folder.identity);
    return await this.runAsync(store, request.folder.identity, false, async stopped => {
      if (!await this.runner.recoverAsync(store, request.folder.identity, request.folder.path))
        return new DeleteFolderResult(DeleteFolderOutcome.HeldUp);
      await this.git.stopStoreAsync(store);
      this.lister.forget(store);
      await this.deleter.deleteAsync(store, stopped);
      return new DeleteFolderResult(DeleteFolderOutcome.Deleted);
    }, signal);
  }

  public override async listAsync(request: ListRequest, signal: AbortSignal = Resources.neverCancelled): Promise<CheckpointList> {
    const store = new FolderStore(this.moduleFolder, request.folder.identity);
    return new CheckpointList(await this.runAsync(store, request.folder.identity, false, async stopped => {
      await this.runner.recoverAsync(store, request.folder.identity, request.folder.path);
      return await this.lister.listAsync(store, stopped);
    }, signal));
  }

  public override async previewRestoreAsync(request: PreviewRequest, signal: AbortSignal = Resources.neverCancelled): Promise<PreviewResult> {
    const store = new FolderStore(this.moduleFolder, request.folder.identity);
    const planned = await this.runAsync(store, request.folder.identity, false, async stopped => {
      await this.runner.recoverAsync(store, request.folder.identity, request.folder.path);
      return await this.planner.planAsync(store, request.folder, request.checkpoint, request.paths, stopped);
    }, signal);
    return planned instanceof NoPlan ? new PreviewResult(planned.preview, null) : new PreviewResult(PreviewOutcome.Planned, planned.plan);
  }

  public override async readAsync(request: ReadRequest, signal: AbortSignal = Resources.neverCancelled): Promise<ReadResult> {
    const store = new FolderStore(this.moduleFolder, request.folder.identity);
    return await this.runAsync(store, request.folder.identity, false, async stopped => {
      await this.runner.recoverAsync(store, request.folder.identity, request.folder.path);
      return await this.fileReader.readAsync(store, request, stopped);
    }, signal);
  }

  public override async restoreAsync(request: RestoreRequest, signal: AbortSignal = Resources.neverCancelled): Promise<RestoreResult> {
    const store = new FolderStore(this.moduleFolder, request.folder.identity);
    return await this.runAsync(store, request.folder.identity, true, stopped => this.runner.restoreAsync(store, request, stopped), signal);
  }

  public override async storageAsync(signal: AbortSignal = Resources.neverCancelled): Promise<StorageList> {
    return await this.trackAsync(this.storage.readAsync(this.moduleFolder, this.stoppedSignalOf(signal)));
  }

  public startSweep(): void {
    this.sweeping = this.deleter.sweepAsync(this.stopping.signal);
  }

  public startGitOnce(): void {
    this.starting = this.git.startOnceAsync(this.moduleFolder, this.stopping.signal).then(
      t => this.log.write(Resources.formatGitStarted(Math.round(t))),
      (error: unknown) => {
        if (!this.stopping.signal.aborted || error !== this.stopping.signal.reason)
          this.log.write(Resources.formatGitStartFailed(Failures.messageOf(error)));
      });
  }

  public async stopAsync(): Promise<void> {
    this.stopping.abort();
    await this.schedule.stopAsync();
    await Promise.allSettled(this.operations);
    await this.sweeping;
    await this.starting;
    await this.git.stopAllAsync();
  }

  private async runAsync<T>(store: FolderStore, identity: string, writes: boolean, operation: (signal: AbortSignal) => Promise<T>, signal: AbortSignal): Promise<T> {
    const stopped = this.stoppedSignalOf(signal);
    return await this.trackAsync(this.schedule.runAsync(store, identity, writes, () => this.queue.runAsync(identity, async () => {
      try {
        return await operation(stopped);
      }
      finally {
        if (stopped.aborted)
          await this.git.stopStoreAsync(store);
      }
    }, stopped)));
  }

  private stoppedSignalOf(signal: AbortSignal): AbortSignal {
    return AbortSignal.any([signal, this.stopping.signal]);
  }

  private async trackAsync<T>(running: Promise<T>): Promise<T> {
    this.operations.add(running);
    try {
      return await running;
    }
    finally {
      this.operations.delete(running);
    }
  }
}
