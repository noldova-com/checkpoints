/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "@noldova/context.core";

import { Resources } from "../resources.ts";
import { IgnoreFile } from "./ignore-file.ts";

export class IgnoreRules {
  private readonly fileMap: Map<string, IgnoreFile> = new Map();
  private readonly repositoryFolderSet: Set<string> = new Set();
  public readonly ignoresCase: boolean;

  public constructor(ignoresCase: boolean) {
    this.ignoresCase = ignoresCase;
  }

  public get files(): readonly IgnoreFile[] {
    return [...this.fileMap.values()];
  }

  public get repositoryFolders(): readonly string[] {
    return [...this.repositoryFolderSet];
  }

  public addFile(file: IgnoreFile): void {
    this.fileMap.set(file.folderPath, file);
  }

  public addRepositoryFolder(folderPath: string): void {
    this.repositoryFolderSet.add(folderPath);
  }

  public excludes(path: string, isFolder: boolean): boolean {
    for (let end = path.indexOf(Resources.relativePathSeparator); end >= 0; end = path.indexOf(Resources.relativePathSeparator, end + 1))
      if (this.isIgnored(path.slice(0, end), true))
        return true;
    return this.isIgnored(path, isFolder);
  }

  public isIgnored(path: string, isFolder: boolean): boolean {
    const bytes = IgnoreFile.bytesOf(path);
    const name = bytes.slice(bytes.lastIndexOf(Resources.relativePathSeparator) + 1);
    let folder = path;
    do {
      folder = folder.slice(0, Math.max(folder.lastIndexOf(Resources.relativePathSeparator), 0));
      const decision = this.fileMap.get(folder)?.decide(bytes, name, isFolder) ?? null;
      if (!Object.isNull(decision))
        return decision;
    } while (folder !== "" && !this.repositoryFolderSet.has(folder));
    return false;
  }
}
