/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { ArchiveHashMismatchException } from "../exceptions/archive-hash-mismatch.exception.ts";
import { ArchiveLongerThanPinnedException } from "../exceptions/archive-longer-than-pinned.exception.ts";
import { ArchiveSizeMismatchException } from "../exceptions/archive-size-mismatch.exception.ts";
import { DownloadFailedException } from "../exceptions/download-failed.exception.ts";
import { Resources } from "../resources.ts";

export class PinnedDownload {
  private readonly report: (line: string) => void;

  public constructor(report: (line: string) => void) {
    this.report = report;
  }

  public static hashOf(content: Buffer): string {
    return createHash(Resources.sha256Algorithm).update(content).digest(Resources.hexEncoding);
  }

  // Gives the file at the address, of the size and SHA-256 builds.json pins: the copy in the cache when it still matches,
  // or else a download, checked as it streams in, that then replaces the cached copy.
  public async readAsync(url: string, size: number, sha256: string, cached: string): Promise<Buffer> {
    if (existsSync(cached)) {
      const content = await readFile(cached);
      if (PinnedDownload.hashOf(content) === sha256)
        return content;
    }

    this.report(Resources.formatDownloading(url));
    const response = await fetch(url, { signal: AbortSignal.timeout(Resources.downloadTimeout) });
    if (!response.ok)
      throw new DownloadFailedException(url, response.status);
    const declared = response.headers.get(Resources.contentLengthHeader);
    if (declared !== null && Number(declared) !== size)
      throw new ArchiveSizeMismatchException(url, Number(declared), size);
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let read = 0;
    for (let chunk = await reader?.read(); chunk !== undefined && !chunk.done; chunk = await reader?.read()) {
      read += chunk.value.length;
      if (read > size)
        throw new ArchiveLongerThanPinnedException(url, size);
      chunks.push(Buffer.from(chunk.value));
    }
    const content = Buffer.concat(chunks);
    if (content.length !== size)
      throw new ArchiveSizeMismatchException(url, content.length, size);
    const hash = PinnedDownload.hashOf(content);
    if (hash !== sha256)
      throw new ArchiveHashMismatchException(url, hash, sha256);
    await mkdir(path.dirname(cached), { recursive: true });
    await writeFile(cached, content);
    return content;
  }
}
