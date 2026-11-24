/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { readdir, rm } from "node:fs/promises";
import path from "node:path";

import "@noldova/context.core";

import type { FolderStore } from "../models/folder-store.ts";
import { Resources } from "../resources.ts";

export class FastImportLeftovers {
  private readonly store: FolderStore;
  private before: ReadonlySet<string> | null = null;

  public constructor(store: FolderStore) {
    this.store = store;
  }

  public async listOnceAsync(): Promise<void> {
    this.before ??= await this.listAsync();
  }

  public async removeAddedAsync(): Promise<void> {
    const before = this.before;
    if (Object.isNull(before))
      return;
    for (const item of await this.listAsync())
      if (!before.has(item))
        await rm(item, { recursive: true, force: true, maxRetries: Resources.removeRetries, retryDelay: Resources.retryDelayMilliseconds });
  }

  private async listAsync(): Promise<ReadonlySet<string>> {
    const objects = path.join(this.store.gitFolder, Resources.objectsFolder);
    const items = (await readdir(objects, { recursive: true })).map(t => path.join(objects, t));
    const reports = (await readdir(this.store.gitFolder)).filter(t => t.startsWith(Resources.fastImportCrashPrefix)).map(t => path.join(this.store.gitFolder, t));
    return new Set([...items, ...reports]);
  }
}
