/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createHash } from "node:crypto";
import type { BigIntStats } from "node:fs";
import { lstat, open, readlink, realpath } from "node:fs/promises";
import path from "node:path";

import "@noldova/context.core";
import { PathKind } from "@noldova/checkpoints.protocol";

import { FolderFile } from "../models/folder-file.ts";
import { ReadFailure } from "../models/read-failure.ts";
import type { UnhashedFile } from "../models/unhashed-file.ts";
import { Resources } from "../resources.ts";

export class FolderFileReader {
  public static async readAsync(folder: string, file: FolderFile | UnhashedFile, keep: number): Promise<Buffer | ReadFailure> {
    return await FolderFileReader.readInsideAsync(folder, file, keep).catch((t: unknown) => ReadFailure.of(t));
  }

  public static linkIdOf(target: Buffer): string {
    return createHash(Resources.objectHashAlgorithm).update(Resources.formatBlobHeader(target.length)).update(target).digest(Resources.hexEncoding);
  }

  public static async objectIdOfAsync(location: string, isLink: boolean): Promise<string> {
    return isLink ? FolderFileReader.linkIdOf(await readlink(location, Resources.bufferEncoding)) : await FolderFileReader.blobIdOfAsync(location);
  }

  private static async blobIdOfAsync(location: string): Promise<string> {
    const handle = await open(location, Resources.noFollowNonBlockingReadFlags);
    try {
      const hash = createHash(Resources.objectHashAlgorithm).update(Resources.formatBlobHeader((await handle.stat({ bigint: true })).size));
      const chunk = Buffer.allocUnsafe(Resources.readChunkSize);
      let bytesRead = -1;
      while (bytesRead !== 0) {
        bytesRead = (await handle.read(chunk, 0, chunk.length, null)).bytesRead;
        hash.update(chunk.subarray(0, bytesRead));
      }
      return hash.digest(Resources.hexEncoding);
    }
    finally {
      await handle.close();
    }
  }

  private static idOf(stats: BigIntStats): string {
    return Resources.formatFileId(stats.dev, stats.ino);
  }

  private static async readFileAsync(location: string, fileId: string, keep: number): Promise<Buffer | null> {
    const handle = await open(location, Resources.noFollowNonBlockingReadFlags);
    try {
      const stats = await handle.stat({ bigint: true });
      if (!stats.isFile() || FolderFileReader.idOf(stats) !== fileId)
        return null;

      const chunks: Buffer[] = [];
      let length = 0;
      let bytesRead = -1;
      while (length < keep && bytesRead !== 0) {
        const chunk = Buffer.allocUnsafe(Math.min(Resources.readChunkSize, keep - length));
        bytesRead = (await handle.read(chunk, 0, chunk.length, null)).bytesRead;
        chunks.push(chunk.subarray(0, bytesRead));
        length += bytesRead;
      }
      return Buffer.concat(chunks);
    }
    finally {
      await handle.close();
    }
  }

  private static async readInsideAsync(folder: string, file: FolderFile | UnhashedFile, keep: number): Promise<Buffer | ReadFailure> {
    const content = file instanceof FolderFile && file.kind === PathKind.Link
      ? await FolderFileReader.readLinkAsync(file.location, file.fileId, file.objectId)
      : await FolderFileReader.readFileAsync(file.location, file.fileId, keep);
    const [root, parent] = await Promise.all([realpath(folder), realpath(path.dirname(file.location))]);
    return !Object.isNull(content) && (parent === root || parent.startsWith(path.join(root, path.sep))) ? content : ReadFailure.Changing;
  }

  private static async readLinkAsync(location: string, fileId: string, objectId: string): Promise<Buffer | null> {
    const target = await readlink(location, Resources.bufferEncoding);
    const stats = await lstat(location, { bigint: true });
    return stats.isSymbolicLink() && FolderFileReader.idOf(stats) === fileId && FolderFileReader.linkIdOf(target) === objectId ? target : null;
  }
}
