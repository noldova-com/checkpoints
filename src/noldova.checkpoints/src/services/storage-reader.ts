/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { Dirent } from "node:fs";
import path from "node:path";

import { FolderReference, FolderUsage, StorageList } from "@noldova/checkpoints.protocol";

import { StoreException } from "../exceptions/store.exception.ts";
import { FolderRecord } from "../models/folder-record.ts";
import { FolderStore } from "../models/folder-store.ts";
import { Resources } from "../resources.ts";
import { Failures } from "./failures.ts";
import { StoreFile } from "./store-file.ts";
import type { StoreReads } from "./store-reads.ts";

export class StorageReader {
  private readonly listFolderAsync: (folder: string) => Promise<Dirent[]>;
  private readonly reads: StoreReads;
  private readonly statFileAsync: (file: string) => Promise<{ readonly size: number }>;

  public constructor(listFolderAsync: (folder: string) => Promise<Dirent[]>, statFileAsync: (file: string) => Promise<{ readonly size: number }>, reads: StoreReads) {
    this.listFolderAsync = listFolderAsync;
    this.reads = reads;
    this.statFileAsync = statFileAsync;
  }

  public async readAsync(moduleFolder: string, signal: AbortSignal): Promise<StorageList> {
    signal.throwIfAborted();
    const folders = path.join(moduleFolder, Resources.foldersFolder);
    const usages: FolderUsage[] = [];
    for (const entry of await this.listAsync(folders) ?? []) {
      signal.throwIfAborted();
      if (!entry.isDirectory() || !Resources.identityPattern.test(entry.name))
        continue;
      const usage = await this.reads.readAsync(entry.name, () => this.readFolderAsync(moduleFolder, entry.name, signal));
      if (usage !== null)
        usages.push(usage);
    }
    return new StorageList(usages.sort((a, b) => b.bytes - a.bytes || (a.identity < b.identity ? -1 : 1)));
  }

  private async readFolderAsync(moduleFolder: string, identity: string, signal: AbortSignal): Promise<FolderUsage | null> {
    const store = new FolderStore(moduleFolder, identity);
    const bytes = await this.sumAsync(store.folder, signal);
    return bytes === null ? null : new FolderUsage(identity, await StorageReader.readPathAsync(store), bytes);
  }

  private async listAsync(folder: string): Promise<Dirent[] | null> {
    try {
      return await this.listFolderAsync(folder);
    }
    catch (error) {
      if (Failures.codeOf(error) === Resources.missingCode)
        return null;
      throw error;
    }
  }

  private static async readPathAsync(store: FolderStore): Promise<string | null> {
    return await Failures.recoverAsync(StoreFile.readAsync(store.folderFile, t => new FolderReference(path.basename(store.folder), FolderRecord.fromJson(t).path).path),
      t => t instanceof StoreException, null);
  }

  private async sumAsync(folder: string, signal: AbortSignal): Promise<number | null> {
    const entries = await this.listAsync(folder);
    if (entries === null)
      return null;
    let bytes = 0;
    for (const entry of entries) {
      signal.throwIfAborted();
      const item = path.join(folder, entry.name);
      bytes += entry.isDirectory() ? await this.sumAsync(item, signal) ?? 0 : await this.sizeAsync(item);
    }
    return bytes;
  }

  private async sizeAsync(file: string): Promise<number> {
    try {
      return (await this.statFileAsync(file)).size;
    }
    catch (error) {
      if (Failures.codeOf(error) === Resources.missingCode)
        return 0;
      throw error;
    }
  }
}
