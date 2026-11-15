/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { ChangeStatus, UnreadReason } from "@noldova/checkpoints.protocol";

import type { SideEntry } from "./side-entry.ts";

export class PendingChange<B extends SideEntry = SideEntry, A extends SideEntry = SideEntry> {
  public readonly after: A | null;
  public readonly before: B | null;
  public readonly path: string;
  public readonly status: ChangeStatus;
  public readonly unreadReason: UnreadReason | null;

  public constructor(path: string, status: ChangeStatus, before: B | null, after: A | null, unreadReason: UnreadReason | null) {
    this.after = after;
    this.before = before;
    this.path = path;
    this.status = status;
    this.unreadReason = unreadReason;
  }
}
