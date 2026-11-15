/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { RestorePlan } from "@noldova/checkpoints.protocol";

import type { CheckpointRecord } from "./checkpoint-record.ts";
import type { FolderFile } from "./folder-file.ts";
import type { PendingChange } from "./pending-change.ts";
import type { SideFolder } from "./side-folder.ts";
import type { SideListing } from "./side-listing.ts";
import type { WalkResult } from "./walk-result.ts";

export class PlannedRestore {
  public readonly changes: readonly PendingChange<FolderFile | SideFolder>[];
  public readonly plan: RestorePlan;
  public readonly record: CheckpointRecord;
  public readonly saved: SideListing;
  public readonly walk: WalkResult;

  public constructor(plan: RestorePlan, record: CheckpointRecord, changes: readonly PendingChange<FolderFile | SideFolder>[], saved: SideListing, walk: WalkResult) {
    this.changes = [...changes];
    this.plan = plan;
    this.record = record;
    this.saved = saved;
    this.walk = walk;
  }
}
