/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { SourcesFieldInvalidException } from "../exceptions/sources-field-invalid.exception.ts";
import { Resources } from "../resources.ts";
import { SourceFile } from "./source-file.ts";
import { SourceSet } from "./source-set.ts";

// The upstream source of each family of Git builds, which builds.json pins: the pages a notice links, and each source
// file the builds and their components were built from, by its address, size and SHA-256.
export class GitSources {
  public readonly sets: ReadonlyMap<string, SourceSet>;

  public constructor(sets: ReadonlyMap<string, SourceSet>) {
    this.sets = sets;
  }

  public static parse(json: unknown, file: string): GitSources {
    const sets = new Map<string, SourceSet>();
    for (const [name, value] of Object.entries(GitSources.readObject(json, Resources.sourcesField, file))) {
      const context = Resources.formatFieldPath(Resources.sourcesField, name);
      if (!Resources.sourceSetNamePattern.test(name))
        throw new SourcesFieldInvalidException(file, context);
      const set = GitSources.readObject(value, context, file);
      const listed = set[Resources.pagesField];
      const pagesPath = Resources.formatFieldPath(context, Resources.pagesField);
      if (!Array.isArray(listed) || listed.length === 0)
        throw new SourcesFieldInvalidException(file, pagesPath);
      const pages: string[] = [];
      for (const page of listed) {
        if (!GitSources.isAddress(page))
          throw new SourcesFieldInvalidException(file, pagesPath);
        pages.push(page);
      }
      const files = set[Resources.filesField];
      if (!Array.isArray(files) || files.length === 0)
        throw new SourcesFieldInvalidException(file, Resources.formatFieldPath(context, Resources.filesField));
      sets.set(name, new SourceSet(name, pages, files.map((t: unknown, i) => {
        const entryPath = Resources.formatFieldPath(context, `${Resources.filesField}[${String(i)}]`);
        const entry = GitSources.readObject(t, entryPath, file);
        const url = entry[Resources.urlField];
        if (!GitSources.isAddress(url))
          throw new SourcesFieldInvalidException(file, Resources.formatFieldPath(entryPath, Resources.urlField));
        return new SourceFile(url, GitSources.readSize(entry, entryPath, file), GitSources.readSha256(entry, entryPath, file));
      })));
    }
    if (sets.size === 0)
      throw new SourcesFieldInvalidException(file, Resources.sourcesField);

    return new GitSources(sets);
  }

  private static isAddress(value: unknown): value is string {
    return typeof value === "string" && value.startsWith(Resources.httpsPrefix) && URL.canParse(value);
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
