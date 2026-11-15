/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { open, symlink, type FileHandle } from "node:fs/promises";

import { PathKind } from "@noldova/checkpoints.protocol";

import type { FolderStore } from "../models/folder-store.ts";
import { LinkKind } from "../models/link-kind.ts";
import type { StagedBlob } from "../models/staged-blob.ts";
import { Resources } from "../resources.ts";
import { BlobBatchWriter } from "./blob-batch.writer.ts";
import type { GitRunner } from "./git-runner.ts";

export class BlobStager {
  private readonly git: GitRunner;

  public constructor(git: GitRunner) {
    this.git = git;
  }

  public async stageAsync(store: FolderStore, blobs: readonly StagedBlob[]): Promise<void> {
    if (blobs.length === 0)
      return;
    const input = blobs.map(t => `${t.objectId}${Resources.lineFeed}`).join("");
    await this.git.readLongAsync(store, Resources.catFileCommand, [Resources.batchOption, Resources.bufferOption], input, async output => {
      const writer = new BlobBatchWriter(blobs);
      try {
        for await (const chunk of output)
          await writer.pushAsync(Buffer.from(chunk));
        writer.end();
      }
      finally {
        await writer.closeAsync();
      }
    }, Resources.neverCancelled);
  }

  public static async createAsync(blob: StagedBlob): Promise<FileHandle> {
    return await open(blob.location, Resources.exclusiveWriteFlag, blob.kind === PathKind.Executable ? Resources.stagedExecutableMode : Resources.stagedFileMode);
  }

  public static async linkAsync(blob: StagedBlob, target: Buffer): Promise<void> {
    return await symlink(target, blob.location, blob.linkKind === LinkKind.Folder ? Resources.folderLinkType : Resources.fileLinkType);
  }
}
