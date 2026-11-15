/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CaptureMode, ChangeStatus, Checkpoint, RestorePlan } from "@noldova/checkpoints.protocol";

import { CheckpointRecord } from "../../src/models/checkpoint-record.ts";
import { EntryKind } from "../../src/models/entry-kind.ts";
import { FolderFile } from "../../src/models/folder-file.ts";
import { PendingChange } from "../../src/models/pending-change.ts";
import { PlannedRestore } from "../../src/models/planned-restore.ts";
import type { SideFolder } from "../../src/models/side-folder.ts";
import { SideListing } from "../../src/models/side-listing.ts";
import { WalkResult } from "../../src/models/walk-result.ts";

describe("PlannedRestore", { concurrency: true }, () => {
  const checkpoint = "01890a5d-ac96-774b-bcce-b302099a8057";

  it("holds the plan, the checkpoint's record, the changes, the listing saved and the walk", () => {
    const plan = new RestorePlan(checkpoint, [], [], 0, 0, "0".repeat(64), null);
    const record = new CheckpointRecord(new Checkpoint(checkpoint, new Date(0), CaptureMode.EveryFile, null, []), [], [], null);
    const change = new PendingChange("a.txt", ChangeStatus.Modified, new FolderFile(EntryKind.File, "a".repeat(40), "/work/project/a.txt", 5, "5:9"), null, null);
    const saved = new SideListing(new Map(), [], [], null);
    const walk = new WalkResult(null);

    const planned = new PlannedRestore(plan, record, [change], saved, walk);

    assert.deepEqual([planned.plan, planned.record, planned.changes, planned.saved, planned.walk], [plan, record, [change], saved, walk]);
  });

  it("keeps its own list of the changes, which a later change to the caller's list leaves as it was", () => {
    const changes: PendingChange<FolderFile | SideFolder>[] = [new PendingChange("a.txt", ChangeStatus.Deleted, new FolderFile(EntryKind.File, "a".repeat(40), "/work/project/a.txt", 5, "5:9"), null, null)];
    const planned = new PlannedRestore(new RestorePlan(checkpoint, [], [], 0, 0, "0".repeat(64), null),
      new CheckpointRecord(new Checkpoint(checkpoint, new Date(0), CaptureMode.EveryFile, null, []), [], [], null), changes, new SideListing(new Map(), [], [], null),
      new WalkResult(null));

    changes.push(new PendingChange("b.txt", ChangeStatus.Added, null, null, null));

    assert.deepEqual(planned.changes.map(t => t.path), ["a.txt"]);
  });
});
