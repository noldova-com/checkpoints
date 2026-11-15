/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { UnreadPath, UnreadReason } from "@noldova/checkpoints.protocol";

import { Resources } from "../resources.ts";
import type { IgnoreRules } from "./ignore-rules.ts";
import type { SideFile } from "./side-file.ts";
import { SideFolder } from "./side-folder.ts";

export class SideListing<F extends SideFile = SideFile> {
  private readonly fileMap: ReadonlyMap<string, F>;
  private readonly folderSet: ReadonlySet<string>;
  private readonly unreadMap: ReadonlyMap<string, UnreadReason>;
  public readonly emptyFolders: readonly string[];
  public readonly rules: IgnoreRules | null;

  public constructor(files: ReadonlyMap<string, F>, emptyFolders: readonly string[], unreadPaths: readonly UnreadPath[], rules: IgnoreRules | null) {
    const folders = new Set(emptyFolders);
    for (const filePath of [...files.keys(), ...emptyFolders])
      for (let end = filePath.indexOf(Resources.relativePathSeparator); end >= 0; end = filePath.indexOf(Resources.relativePathSeparator, end + 1))
        folders.add(filePath.slice(0, end));

    this.emptyFolders = [...emptyFolders];
    this.fileMap = files;
    this.folderSet = folders;
    this.rules = rules;
    this.unreadMap = new Map(unreadPaths.map(t => [t.path, t.reason]));
  }

  public get paths(): readonly string[] {
    return [...this.fileMap.keys(), ...this.emptyFolders, ...this.unreadMap.keys()];
  }

  public entryOf(relativePath: string): F | SideFolder | null {
    return this.fileMap.get(relativePath) ?? (this.folderSet.has(relativePath) ? SideFolder.Instance : null);
  }

  public excludes(relativePath: string, isFolder: boolean): boolean {
    return this.rules !== null && this.rules.excludes(relativePath, isFolder);
  }

  public unreadReasonOf(relativePath: string): UnreadReason | null {
    for (let end = relativePath.length; end > 0; end = relativePath.lastIndexOf(Resources.relativePathSeparator, end - 1)) {
      const reason = this.unreadMap.get(relativePath.slice(0, end));
      if (reason !== undefined)
        return reason;
    }
    return null;
  }

  public isUnderUnread(relativePath: string): boolean {
    const end = relativePath.lastIndexOf(Resources.relativePathSeparator);
    return end > 0 && this.unreadReasonOf(relativePath.slice(0, end)) !== null;
  }
}
