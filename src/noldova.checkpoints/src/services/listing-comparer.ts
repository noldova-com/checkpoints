/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ChangeStatus, PathKind } from "@noldova/checkpoints.protocol";

import { PendingChange } from "../models/pending-change.ts";
import type { SideEntry } from "../models/side-entry.ts";
import type { SideFile } from "../models/side-file.ts";
import type { SideFolder } from "../models/side-folder.ts";
import type { SideListing } from "../models/side-listing.ts";

export class ListingComparer {
  public static compare<B extends SideFile, A extends SideFile>(before: SideListing<B>, after: SideListing<A>): readonly PendingChange<B | SideFolder, A | SideFolder>[] {
    const paths = [...new Set([...before.paths, ...after.paths])].sort((t, u) => Buffer.compare(Buffer.from(t), Buffer.from(u)));
    return paths.flatMap(t => {
      const change = ListingComparer.compareAt(t, before, after);
      return change === null ? [] : [change];
    });
  }

  private static compareAt<B extends SideFile, A extends SideFile>(path: string, before: SideListing<B>, after: SideListing<A>): PendingChange<B | SideFolder, A | SideFolder> | null {
    if (before.isUnderUnread(path) || after.isUnderUnread(path))
      return null;

    const old = before.entryOf(path);
    const current = after.entryOf(path);
    const isFolder = (current ?? old)?.kind === PathKind.Folder;
    if (before.excludes(path, isFolder) || after.excludes(path, isFolder))
      return null;

    const unreadReason = after.unreadReasonOf(path) ?? before.unreadReasonOf(path);
    if (unreadReason !== null)
      return new PendingChange(path, ChangeStatus.Unknown, old, current, unreadReason);
    if (old === null || current === null)
      return ListingComparer.compareOneSide(path, old, current);
    if (old.isOtherKindThan(current))
      return new PendingChange(path, ChangeStatus.KindChanged, old, current, null);
    return old.isSameAs(current) ? null : new PendingChange(path, ChangeStatus.Modified, old, current, null);
  }

  private static compareOneSide<B extends SideEntry, A extends SideEntry>(path: string, old: B | null, current: A | null): PendingChange<B, A> {
    return old === null
      ? new PendingChange<B, A>(path, ChangeStatus.Added, null, current, null)
      : new PendingChange<B, A>(path, ChangeStatus.Deleted, old, null, null);
  }
}
