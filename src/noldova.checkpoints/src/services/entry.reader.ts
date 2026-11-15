/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createHash } from "node:crypto";
import { lstat, open, readlink } from "node:fs/promises";

import { UnreadPath, UnreadReason } from "@noldova/checkpoints.protocol";

import { EntryKind } from "../models/entry-kind.ts";
import { IndexEntry } from "../models/index-entry.ts";
import { ReadFailure } from "../models/read-failure.ts";
import { WalkedEntry } from "../models/walked-entry.ts";
import { Resources } from "../resources.ts";
import { FolderFileReader } from "./folder-file.reader.ts";
import type { InputWriter } from "./input-writer.ts";

export class EntryReader {
  private readonly platform: string;

  public constructor(platform: string) {
    this.platform = platform;
  }

  public async readAsync(input: InputWriter, entry: WalkedEntry): Promise<IndexEntry | UnreadPath | null> {
    let current = entry;
    for (let attempt = 1; ; attempt++) {
      const objectId = current.kind === EntryKind.Link
        ? await EntryReader.readLinkAsync(input, current)
        : await EntryReader.readFileAsync(input, current);
      if (objectId instanceof ReadFailure)
        return objectId.unreadOf(entry.path);
      if (objectId !== null)
        return IndexEntry.of(current, objectId);
      if (input.isStopped || attempt === Resources.maximumReadAttempts)
        return new UnreadPath(entry.path, UnreadReason.Changing, null);

      const stats = await lstat(entry.location, { bigint: true }).catch((t: unknown) => ReadFailure.of(t));
      if (stats instanceof ReadFailure)
        return stats.unreadOf(entry.path);
      if (EntryKind.ofStats(this.platform, stats) !== entry.kind)
        return new UnreadPath(entry.path, UnreadReason.Changing, null);
      current = new WalkedEntry(entry.path, entry.location, entry.kind, stats);
    }
  }

  private static async readFileAsync(input: InputWriter, entry: WalkedEntry): Promise<string | ReadFailure | null> {
    const handle = await open(entry.location, Resources.noFollowNonBlockingReadFlags).catch((t: unknown) => ReadFailure.of(t));
    if (handle instanceof ReadFailure)
      return handle;

    try {
      if (!entry.isUnchanged(await handle.stat({ bigint: true })))
        return null;

      const hash = createHash(Resources.objectHashAlgorithm).update(Resources.formatBlobHeader(entry.size));
      await input.writeAsync(Resources.formatFastImportBlob(entry.size));
      let remaining = entry.size;
      let bytesRead = -1;
      while (remaining > 0 && bytesRead !== 0 && !input.isStopped) {
        const chunk = Buffer.allocUnsafe(Math.min(Resources.readChunkSize, remaining));
        bytesRead = (await handle.read(chunk, 0, chunk.length, null)).bytesRead;
        hash.update(chunk.subarray(0, bytesRead));
        await input.writeAsync(chunk.subarray(0, bytesRead));
        remaining -= bytesRead;
      }
      const zeros = Buffer.alloc(Math.min(Resources.readChunkSize, remaining));
      for (let padded = 0; padded < remaining && !input.isStopped; padded += zeros.length)
        await input.writeAsync(zeros.subarray(0, Math.min(zeros.length, remaining - padded)));
      if (input.isStopped)
        return null;

      await input.writeAsync(Resources.lineFeed);
      const longer = (await handle.read(Buffer.alloc(1), 0, 1, null)).bytesRead > 0;
      const whole = remaining === 0 && !longer && entry.isUnchanged(await handle.stat({ bigint: true }));
      return whole ? hash.digest(Resources.hexEncoding) : null;
    }
    finally {
      await handle.close();
    }
  }

  private static async readLinkAsync(input: InputWriter, entry: WalkedEntry): Promise<string | ReadFailure> {
    const target = await readlink(entry.location, Resources.bufferEncoding).catch((t: unknown) => ReadFailure.of(t));
    if (target instanceof ReadFailure)
      return target;

    await input.writeAsync(Resources.formatFastImportBlob(target.length));
    await input.writeAsync(target);
    await input.writeAsync(Resources.lineFeed);
    return FolderFileReader.linkIdOf(target);
  }
}
