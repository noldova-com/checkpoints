/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { randomUUID } from "node:crypto";
import type { RmOptions } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import timers from "node:timers/promises";

import type { IModuleLog } from "@noldova/desktop.runtime";

import type { FolderStore } from "../models/folder-store.ts";
import { Resources } from "../resources.ts";
import { Failures } from "./failures.ts";
import type { StoreReads } from "./store-reads.ts";

export class FolderDeleter {
  private readonly deleted: string;
  private readonly log: IModuleLog;
  private readonly reads: StoreReads;
  private readonly removeFolderAsync: (folder: string, options: RmOptions) => Promise<void>;
  private readonly removing: Set<string> = new Set();
  private readonly renameFolderAsync: (from: string, to: string) => Promise<void>;

  public constructor(moduleFolder: string, log: IModuleLog, renameFolderAsync: (from: string, to: string) => Promise<void>,
    removeFolderAsync: (folder: string, options: RmOptions) => Promise<void>, reads: StoreReads) {
    this.deleted = path.join(moduleFolder, Resources.deletedFolder);
    this.log = log;
    this.reads = reads;
    this.removeFolderAsync = removeFolderAsync;
    this.renameFolderAsync = renameFolderAsync;
  }

  public async deleteAsync(store: FolderStore, signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    const target = path.join(this.deleted, Resources.formatDeletedName(path.basename(store.folder), randomUUID()));
    await mkdir(this.deleted, { recursive: true });
    this.removing.add(target);
    try {
      if (await this.reads.moveAsync(path.basename(store.folder), () => this.renameAsync(store.folder, target, signal, 1)))
        await this.removeAsync(target);
    }
    finally {
      this.removing.delete(target);
    }
  }

  public async sweepAsync(signal: AbortSignal): Promise<void> {
    let names: string[];
    try {
      names = await readdir(this.deleted);
    }
    catch (error) {
      if (Failures.codeOf(error) !== Resources.missingCode)
        this.log.write(Resources.formatRemoveFailed(this.deleted, Failures.messageOf(error)));
      return;
    }
    for (const name of names) {
      const target = path.join(this.deleted, name);
      if (!this.removing.has(target))
        await this.removeAsync(target);
      if (signal.aborted)
        return;
    }
  }

  private async renameAsync(folder: string, target: string, signal: AbortSignal, attempt: number): Promise<boolean> {
    try {
      await this.renameFolderAsync(folder, target);
      return true;
    }
    catch (error) {
      if (Failures.codeOf(error) === Resources.missingCode)
        return false;
      if (!Failures.hasCode(error, Resources.retriedCodes) || attempt === Resources.renameAttempts)
        throw error;
    }
    await timers.setTimeout(Resources.renameRetryDelayMilliseconds, undefined, { signal }).catch((error: unknown) => {
      signal.throwIfAborted();
      throw error;
    });
    signal.throwIfAborted();
    return await this.renameAsync(folder, target, signal, attempt + 1);
  }

  private async removeAsync(target: string): Promise<void> {
    try {
      await this.removeFolderAsync(target, { recursive: true, force: true, maxRetries: Resources.removeRetries, retryDelay: Resources.retryDelayMilliseconds });
    }
    catch (error) {
      this.log.write(Resources.formatRemoveFailed(target, Failures.messageOf(error)));
    }
  }
}
