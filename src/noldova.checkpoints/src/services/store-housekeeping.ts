/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

import type { FolderStore } from "../models/folder-store.ts";
import { HousekeepingRecord } from "../models/housekeeping-record.ts";
import { ObjectCounts } from "../models/object-counts.ts";
import { Resources } from "../resources.ts";
import { Clock } from "./clock.ts";
import { Failures } from "./failures.ts";
import type { FreeSpace } from "./free-space.ts";
import type { GitRunner } from "./git-runner.ts";
import { StoreFile } from "./store-file.ts";

export class StoreHousekeeping {
  private readonly clock: Clock;
  private readonly git: GitRunner;
  private readonly readFreeAsync: typeof FreeSpace.readAsync;

  public constructor(git: GitRunner, readFreeAsync: typeof FreeSpace.readAsync, clock: Clock = Clock.system) {
    this.clock = clock;
    this.git = git;
    this.readFreeAsync = readFreeAsync;
  }

  public async runAsync(store: FolderStore, signal: AbortSignal): Promise<boolean> {
    if (!await Failures.recoverAsync(stat(store.gitFolder).then(t => t.isDirectory()), t => Failures.isAbsent(t), false))
      return false;
    const record = await StoreFile.readAsync(store.housekeepingFile, t => HousekeepingRecord.fromJson(t));
    await this.git.stopStoreAsync(store, [Resources.fastImportCommand]);
    await this.removeTemporaryFilesAsync(store);
    const counts = ObjectCounts.parse((await this.git.runAsync(store, Resources.countObjectsCommand, Resources.countObjectsArguments, "", signal))
      .toString(Resources.utf8Encoding));
    if (await this.readFreeAsync(store.folder) < Resources.spaceMargin + (counts.looseSize + counts.packSize) * Resources.bytesPerKibibyte)
      return false;

    await this.git.runLongAsync(store, Resources.packRefsCommand, Resources.packRefsArguments, signal);
    const time = this.clock.now();
    if (record === null || time - record.fullPass >= Resources.fullPassInterval || time < record.fullPass) {
      await this.git.stopStoreAsync(store);
      await this.git.runLongAsync(store, Resources.repackCommand, Resources.formatCruftRepackArguments(Resources.unreachableExpiry), signal);
      await this.git.runLongAsync(store, Resources.pruneCommand, [Resources.formatPruneArgument(Resources.unreachableExpiry)], signal);
      await this.removeCrashReportsAsync(store, time);
      await StoreFile.writeAsync(store.housekeepingFile, new HousekeepingRecord(this.clock.now()).toJson());
    }
    else if (counts.loose >= Resources.looseObjectLimit || counts.packs >= Resources.packLimit) {
      await this.git.stopStoreAsync(store);
      await this.git.runLongAsync(store, Resources.repackCommand, Resources.geometricRepackArguments, signal);
    }
    return true;
  }

  private async removeTemporaryFilesAsync(store: FolderStore): Promise<void> {
    const folder = path.join(store.gitFolder, Resources.objectsFolder, Resources.packFolder);
    for (const name of await readdir(folder))
      if (Resources.temporaryPackPrefixes.some(t => name.startsWith(t)) || name.endsWith(Resources.keepSuffix))
        await rm(path.join(folder, name), { force: true, maxRetries: Resources.removeRetries, retryDelay: Resources.retryDelayMilliseconds });
  }

  private async removeCrashReportsAsync(store: FolderStore, time: number): Promise<void> {
    for (const name of await readdir(store.gitFolder)) {
      if (!name.startsWith(Resources.fastImportCrashPrefix))
        continue;
      const report = path.join(store.gitFolder, name);
      if (time - (await stat(report)).mtimeMs >= Resources.unreachableAge)
        await rm(report, { force: true, maxRetries: Resources.removeRetries, retryDelay: Resources.retryDelayMilliseconds });
    }
  }
}
