/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createHash } from "node:crypto";
import { mkdir, open, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { SourceArchiveDiffersException } from "../exceptions/source-archive-differs.exception.ts";
import { SourcesFieldInvalidException } from "../exceptions/sources-field-invalid.exception.ts";
import type { GitSources } from "../models/git-sources.ts";
import type { SourceArchive } from "../models/source-archive.ts";
import { Resources } from "../resources.ts";
import { PinnedDownload } from "./pinned-download.ts";
import { SourceTar } from "./source-tar.ts";

// Packs each source archive builds.json names into _build/git-sources, from the source files it pins, downloaded and
// checked as the builds are, with its .sha256 beside it; it packs every archive, then refuses the first whose size or
// SHA-256 isn't the one builds.json pins, having named each such archive's size and SHA-256.
export class GitSourcePacker {
  private readonly download: PinnedDownload;
  private readonly report: (line: string) => void;
  private readonly root: string;
  private readonly sources: GitSources;

  public constructor(root: string, sources: GitSources, report: (line: string) => void) {
    this.download = new PinnedDownload(report);
    this.report = report;
    this.root = root;
    this.sources = sources;
  }

  public get output(): string {
    return path.join(this.root, Resources.buildWorkFolder, Resources.packedSourcesFolder);
  }

  public async packAsync(): Promise<void> {
    await rm(this.output, { recursive: true, force: true });
    await mkdir(this.output, { recursive: true });
    const differences: SourceArchiveDiffersException[] = [];
    for (const archive of this.sources.archives.values()) {
      const difference = await this.packArchiveAsync(archive);
      if (difference !== null) {
        this.report(difference.message);
        differences.push(difference);
      }
    }
    const [first] = differences;
    if (first !== undefined)
      throw first;
  }

  private async packArchiveAsync(archive: SourceArchive): Promise<SourceArchiveDiffersException | null> {
    const names = archive.files.map(t => t.name);
    if (new Set(names).size !== names.length || !names.every(t => SourceTar.fits(t)))
      throw new SourcesFieldInvalidException(Resources.buildsFile, Resources.formatFieldPath(archive.name, Resources.filesField));
    const file = path.join(this.output, archive.name);
    const hash = createHash(Resources.sha256Algorithm);
    let size = 0;
    const handle = await open(file, Resources.writeFlag);
    try {
      const put = async (bytes: Buffer): Promise<void> => {
        await handle.writeFile(bytes);
        hash.update(bytes);
        size += bytes.length;
      };
      for (const entry of archive.files) {
        const cached = path.join(this.root, Resources.buildWorkFolder, Resources.sourceFilesFolder, Resources.formatCachedSource(entry.sha256, entry.name));
        const content = await this.download.readAsync(entry.url, entry.size, entry.sha256, cached);
        await put(SourceTar.headerOf(entry.name, content.length));
        await put(content);
        await put(SourceTar.paddingOf(content.length));
      }
      await put(SourceTar.end);
    }
    finally {
      await handle.close();
    }

    const sha256 = hash.digest(Resources.hexEncoding);
    if (size !== archive.size || sha256 !== archive.sha256)
      return new SourceArchiveDiffersException(archive.name, size, sha256, archive.size, archive.sha256);
    await writeFile(`${file}${Resources.sha256Extension}`, Resources.formatSha256Line(sha256, archive.name));
    this.report(Resources.formatSourceArchivePacked(archive.name, archive.files.length, size));
    return null;
  }
}
