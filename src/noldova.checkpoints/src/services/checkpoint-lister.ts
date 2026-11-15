/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { Checkpoint } from "@noldova/checkpoints.protocol";

import { CheckpointFileMissingException } from "../exceptions/checkpoint-file-missing.exception.ts";
import { CheckpointRecord } from "../models/checkpoint-record.ts";
import type { FolderStore } from "../models/folder-store.ts";
import { NewestCheckpoint } from "../models/newest-checkpoint.ts";
import { Resources } from "../resources.ts";
import type { GitRunner } from "./git-runner.ts";
import { StoreFile } from "./store-file.ts";
import { StoreOpener } from "./store-opener.ts";

export class CheckpointLister {
  private readonly git: GitRunner;
  private readonly newest: Map<string, NewestCheckpoint | null> = new Map();

  public constructor(git: GitRunner) {
    this.git = git;
  }

  public async findNewestAsync(store: FolderStore, signal: AbortSignal): Promise<string | null> {
    const remembered = this.newest.get(store.folder);
    if (remembered !== undefined)
      return remembered?.commit ?? null;
    const output = await this.git.runAsync(store, Resources.forEachRefCommand,
      [...Resources.latestCheckpointArguments, Resources.checkpointReferencePrefix], "", signal);
    const line = output.toString(Resources.utf8Encoding).trim();
    const separator = line.indexOf(Resources.batchHeaderSeparator);
    const found = separator < 0 ? null : new NewestCheckpoint(line.slice(0, separator), line.slice(separator + Resources.batchHeaderSeparator.length));
    this.newest.set(store.folder, found);
    return found?.commit ?? null;
  }

  public forget(store: FolderStore): void {
    this.newest.delete(store.folder);
  }

  public remember(store: FolderStore, id: string, commit: string): void {
    const remembered = this.newest.get(store.folder);
    const reference = `${Resources.checkpointReferencePrefix}${id}`;
    if (remembered === null || (remembered !== undefined && reference > remembered.reference))
      this.newest.set(store.folder, new NewestCheckpoint(reference, commit));
  }

  public async listAsync(store: FolderStore, signal: AbortSignal): Promise<readonly Checkpoint[]> {
    if (!await StoreOpener.existsAsync(store))
      return [];

    const commits = await this.readCommitsAsync(store, signal);
    const output = await this.git.runAsync(store, Resources.catFileCommand, [Resources.batchOption, Resources.bufferOption],
      commits.map(t => `${Resources.formatRevisionPath(t, Resources.checkpointFile)}${Resources.lineFeed}`).join(""), signal);
    const checkpoints: Checkpoint[] = [];
    let offset = 0;
    for (const commit of commits) {
      const headerEnd = output.indexOf(Resources.lineFeed, offset);
      const [, type, size] = output.subarray(offset, headerEnd).toString(Resources.utf8Encoding).split(Resources.batchHeaderSeparator);
      if (type !== Resources.blobType)
        throw new CheckpointFileMissingException(commit);
      const contentEnd = headerEnd + 1 + Number(size);
      checkpoints.push(StoreFile.parse(Resources.checkpointFile, output.subarray(headerEnd + 1, contentEnd).toString(Resources.utf8Encoding), u => CheckpointRecord.fromJson(u)).checkpoint);
      offset = contentEnd + 1;
    }
    return checkpoints;
  }

  private async readCommitsAsync(store: FolderStore, signal: AbortSignal): Promise<readonly string[]> {
    const output = await this.git.runAsync(store, Resources.forEachRefCommand,
      [...Resources.checkpointListArguments, Resources.checkpointReferencePrefix], "", signal);
    return output.toString(Resources.utf8Encoding).split(Resources.lineFeed).filter(t => t !== "");
  }
}
