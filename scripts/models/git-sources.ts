/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { SourcesFieldInvalidException } from "../exceptions/sources-field-invalid.exception.ts";
import { Resources } from "../resources.ts";
import { SourceArchive } from "./source-archive.ts";
import { SourceFile } from "./source-file.ts";

export class GitSources {
  public readonly release: string;
  public readonly archives: ReadonlyMap<string, SourceArchive>;

  public constructor(release: string, archives: ReadonlyMap<string, SourceArchive>) {
    this.release = release;
    this.archives = archives;
  }

  public static parse(json: unknown, file: string): GitSources {
    const fields = GitSources.readObject(json, Resources.sourcesField, file);
    const release = fields[Resources.releaseField];
    if (typeof release !== "string" || !Resources.sourcesReleasePattern.test(release))
      throw new SourcesFieldInvalidException(file, Resources.formatFieldPath(Resources.sourcesField, Resources.releaseField));
    const archives = new Map<string, SourceArchive>();
    const archivesPath = Resources.formatFieldPath(Resources.sourcesField, Resources.archivesField);
    for (const [name, value] of Object.entries(GitSources.readObject(fields[Resources.archivesField], archivesPath, file))) {
      const context = Resources.formatFieldPath(archivesPath, name);
      if (!Resources.sourceArchiveNamePattern.test(name))
        throw new SourcesFieldInvalidException(file, context);
      const archive = GitSources.readObject(value, context, file);
      const files = archive[Resources.filesField];
      if (!Array.isArray(files) || files.length === 0)
        throw new SourcesFieldInvalidException(file, Resources.formatFieldPath(context, Resources.filesField));
      archives.set(name, new SourceArchive(name, Resources.formatSourceArchiveAddress(release, name), GitSources.readSize(archive, context, file),
        GitSources.readSha256(archive, context, file), files.map((t: unknown, i) => {
          const entryPath = Resources.formatFieldPath(context, `${Resources.filesField}[${String(i)}]`);
          const entry = GitSources.readObject(t, entryPath, file);
          const url = entry[Resources.urlField];
          if (typeof url !== "string" || !url.startsWith(Resources.httpsPrefix) || Resources.fileNameOf(url) === "")
            throw new SourcesFieldInvalidException(file, Resources.formatFieldPath(entryPath, Resources.urlField));
          return new SourceFile(url, GitSources.readSize(entry, entryPath, file), GitSources.readSha256(entry, entryPath, file));
        })));
    }
    if (archives.size === 0)
      throw new SourcesFieldInvalidException(file, archivesPath);

    return new GitSources(release, archives);
  }

  private static readSize(fields: Readonly<Record<string, unknown>>, context: string, file: string): number {
    const size = fields[Resources.sizeField];
    if (typeof size !== "number" || !Number.isSafeInteger(size) || size <= 0)
      throw new SourcesFieldInvalidException(file, Resources.formatFieldPath(context, Resources.sizeField));
    return size;
  }

  private static readSha256(fields: Readonly<Record<string, unknown>>, context: string, file: string): string {
    const sha256 = fields[Resources.sha256Field];
    if (typeof sha256 !== "string" || !Resources.sha256Pattern.test(sha256))
      throw new SourcesFieldInvalidException(file, Resources.formatFieldPath(context, Resources.sha256Field));
    return sha256;
  }

  private static readObject(value: unknown, field: string, file: string): Readonly<Record<string, unknown>> {
    if (typeof value !== "object" || value === null || Array.isArray(value))
      throw new SourcesFieldInvalidException(file, field);
    return Object.fromEntries(Object.entries(value));
  }
}
