/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";

import { ChangeStatus } from "@noldova/checkpoints.protocol";

import { EntryKind } from "../../src/models/entry-kind.ts";
import { FolderFile } from "../../src/models/folder-file.ts";
import { PendingChange } from "../../src/models/pending-change.ts";
import { TreeFile } from "../../src/models/tree-file.ts";
import { WalkResult } from "../../src/models/walk-result.ts";
import { PlanState } from "../../src/services/plan-state.ts";

type Inputs = {
  readonly path: string;
  readonly kind: EntryKind;
  readonly objectId: string;
  readonly size: number;
  readonly fileId: string;
  readonly rootId: string;
  readonly folderId: string;
};

describe("PlanState", { concurrency: true }, () => {
  const digestOf = (lines: readonly (readonly unknown[])[]): string => createHash("sha256").update(lines.map(t => `${JSON.stringify(t)}\n`).join("")).digest("hex");
  const walkOf = (ids: ReadonlyMap<string, string>): WalkResult => {
    const walk = new WalkResult(null);
    for (const [folder, id] of ids)
      walk.addFolder(folder, id, 0n);
    return walk;
  };
  const base: Inputs = { path: "a/b.txt", kind: EntryKind.File, objectId: "a".repeat(40), size: 1, fileId: "1:10", rootId: "1:1", folderId: "1:2" };
  const digestWith = (change: Partial<Inputs>): string => {
    const inputs = { ...base, ...change };
    const file = new FolderFile(inputs.kind, inputs.objectId, `/project/${inputs.path}`, inputs.size, inputs.fileId);
    return PlanState.digestOf([new PendingChange(inputs.path, ChangeStatus.Modified, file, null, null)], walkOf(new Map([["", inputs.rootId], ["a", inputs.folderId]])));
  };

  it("hashes each change's path, kind, object id, size and own file id, ahead of each folder above the changes once, in order, with the walk's id for it", () => {
    const changes = [
      new PendingChange("a/b/c.txt", ChangeStatus.Modified, new FolderFile(EntryKind.File, "o1", "/project/a/b/c.txt", 3, "1:10"), null, null),
      new PendingChange("a/b/d.txt", ChangeStatus.Deleted, new FolderFile(EntryKind.Executable, "o2", "/project/a/b/d.txt", 4, "1:11"), null, null)
    ];
    const walk = walkOf(new Map([["", "1:1"], ["a", "1:2"], ["a/b", "1:3"], ["a/b/c.txt", "1:99"]]));

    const digest = PlanState.digestOf(changes, walk);

    assert.equal(digest, digestOf([
      ["a/b/c.txt", "File", "o1", 3, "1:10"],
      ["a/b/d.txt", "Executable", "o2", 4, "1:11"],
      ["", "1:1"],
      ["a", "1:2"],
      ["a/b", "1:3"]
    ]));
  });

  it("takes a change's file id from the walk when the change has none, and hashes null when neither has one", () => {
    const changes = [
      new PendingChange("x", ChangeStatus.Added, null, null, null),
      new PendingChange("y.txt", ChangeStatus.Modified, new TreeFile(EntryKind.File, "o3"), null, null)
    ];

    const digest = PlanState.digestOf(changes, walkOf(new Map([["x", "1:5"]])));

    assert.equal(digest, digestOf([
      ["x", null, null, null, "1:5"],
      ["y.txt", "File", "o3", null, null],
      ["", null]
    ]));
  });

  it("changes when any input it hashes changes, and stays the same when nothing does", () => {
    const digests = [
      digestWith({}),
      digestWith({ path: "a/c.txt" }),
      digestWith({ kind: EntryKind.Executable }),
      digestWith({ objectId: "b".repeat(40) }),
      digestWith({ size: 2 }),
      digestWith({ fileId: "1:11" }),
      digestWith({ rootId: "1:3" }),
      digestWith({ folderId: "1:4" })
    ];

    assert.equal(digestWith({}), digests[0]);
    assert.equal(new Set(digests).size, digests.length);
  });
});
