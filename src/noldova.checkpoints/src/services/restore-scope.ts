/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "@noldova/context.core";
import { PathKind } from "@noldova/checkpoints.protocol";

import type { PendingChange } from "../models/pending-change.ts";
import type { WalkResult } from "../models/walk-result.ts";
import { Resources } from "../resources.ts";

export class RestoreScope {
  private readonly paths: readonly string[] | null;

  public constructor(paths: readonly string[] | null) {
    this.paths = paths;
  }

  public includes(relativePath: string): boolean {
    return Object.isNull(this.paths) || this.paths.some(t => relativePath === t || RestoreScope.isUnder(relativePath, t));
  }

  public needs(change: PendingChange): boolean {
    return this.includes(change.path) || (this.isAbove(change.path) && change.after?.kind === PathKind.Folder);
  }

  public reports(relativePath: string): boolean {
    return this.includes(relativePath) || this.isAbove(relativePath);
  }

  public mayRemove(folder: string, walk: WalkResult): boolean {
    if (this.includes(folder))
      return true;
    if (!this.isAbove(folder))
      return false;
    const found = [...walk.entries.map(RestoreScope.pathOf), ...walk.emptyFolders, ...walk.ignoredPaths, ...walk.repositoryPaths, ...walk.unreadPaths.map(RestoreScope.pathOf)];
    return found.every(t => !RestoreScope.isUnder(t, folder) || this.includes(t));
  }

  private isAbove(relativePath: string): boolean {
    return !Object.isNull(this.paths) && this.paths.some(t => RestoreScope.isUnder(t, relativePath));
  }

  private static pathOf(found: { readonly path: string }): string {
    return found.path;
  }

  private static isUnder(relativePath: string, folder: string): boolean {
    return relativePath.startsWith(`${folder}${Resources.relativePathSeparator}`);
  }
}
