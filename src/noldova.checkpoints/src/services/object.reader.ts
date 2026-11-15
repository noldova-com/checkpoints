/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { FolderStore } from "../models/folder-store.ts";
import { ObjectBatch } from "../models/object-batch.ts";
import type { StoredObject } from "../models/stored-object.ts";
import { Resources } from "../resources.ts";
import { BatchOutputParser } from "./batch-output.parser.ts";
import type { GitRunner } from "./git-runner.ts";

export class ObjectReader {
  private readonly git: GitRunner;

  public constructor(git: GitRunner) {
    this.git = git;
  }

  public async readAsync(store: FolderStore, names: readonly string[], keep: number, largest: number, signal: AbortSignal): Promise<ObjectBatch> {
    const unique = [...new Set(names)];
    if (unique.length === 0)
      return new ObjectBatch([], []);

    const checked = new ObjectBatch(unique, await this.runAsync(store, Resources.catFileInfo, unique, 0, signal));
    const wanted = unique.filter(t => checked.get(t).type !== Resources.missingType && checked.get(t).size <= largest);
    if (wanted.length === 0)
      return checked;
    const read = new ObjectBatch(wanted, await this.runAsync(store, Resources.catFileContents, wanted, keep, signal));
    const isRead = new Set(wanted);
    return new ObjectBatch(unique, unique.map(t => isRead.has(t) ? read.get(t) : checked.get(t)));
  }

  public async readOneAsync(store: FolderStore, name: string, keep: number, largest: number, signal: AbortSignal): Promise<StoredObject> {
    return (await this.readAsync(store, [name], keep, largest, signal)).get(name);
  }

  private async runAsync(store: FolderStore, command: string, names: readonly string[], keep: number, signal: AbortSignal): Promise<readonly StoredObject[]> {
    return await this.git.batchAsync(store, names.map(t => Resources.formatBatchCommand(command, t)).join(""), async output => {
      const parser = new BatchOutputParser(keep, command === Resources.catFileContents);
      while (parser.objects.length < names.length)
        parser.push(await output.nextChunkAsync());
      return parser.objects;
    }, signal);
  }
}
