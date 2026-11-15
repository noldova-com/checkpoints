/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ChangeStatus, UnreadReason } from "@noldova/checkpoints.protocol";

import { EntryKind } from "../../src/models/entry-kind.ts";
import { PendingChange } from "../../src/models/pending-change.ts";
import { TreeFile } from "../../src/models/tree-file.ts";

describe("PendingChange", { concurrency: true }, () => {
  it("holds the path, how it changed, each side and why a side couldn't read it", () => {
    const before = new TreeFile(EntryKind.File, "id-1");

    const change = new PendingChange("a.txt", ChangeStatus.Unknown, before, null, UnreadReason.Denied);

    assert.deepEqual([change.path, change.status, change.before, change.after, change.unreadReason], ["a.txt", ChangeStatus.Unknown, before, null, UnreadReason.Denied]);
  });
});
