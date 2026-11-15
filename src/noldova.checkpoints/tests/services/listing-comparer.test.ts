/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ChangeStatus, UnreadPath, UnreadReason } from "@noldova/checkpoints.protocol";

import { EntryKind } from "../../src/models/entry-kind.ts";
import { IgnoreFile } from "../../src/models/ignore-file.ts";
import { IgnoreRules } from "../../src/models/ignore-rules.ts";
import { PendingChange } from "../../src/models/pending-change.ts";
import type { SideFile } from "../../src/models/side-file.ts";
import { SideFolder } from "../../src/models/side-folder.ts";
import { SideListing } from "../../src/models/side-listing.ts";
import { TreeFile } from "../../src/models/tree-file.ts";
import { ListingComparer } from "../../src/services/listing-comparer.ts";

describe("ListingComparer", { concurrency: true }, () => {
  const file = (id: string): TreeFile => new TreeFile(EntryKind.File, id);
  const listingOf = (files: Readonly<Record<string, SideFile>>, emptyFolders: readonly string[] = [], unreadPaths: readonly UnreadPath[] = [], rules: IgnoreRules | null = null): SideListing =>
    new SideListing(new Map(Object.entries(files)), emptyFolders, unreadPaths, rules);

  it("finds added, deleted and modified files, and none for one that's the same, in the byte order of their paths", () => {
    const before = listingOf({ "b.txt": file("1"), "a.txt": file("2"), "same.txt": file("3") });
    const after = listingOf({ "a.txt": file("4"), "same.txt": file("3"), "é.txt": file("5"), "Z.txt": file("6") });

    assert.deepEqual(ListingComparer.compare(before, after), [
      new PendingChange("Z.txt", ChangeStatus.Added, null, file("6"), null),
      new PendingChange("a.txt", ChangeStatus.Modified, file("2"), file("4"), null),
      new PendingChange("b.txt", ChangeStatus.Deleted, file("1"), null, null),
      new PendingChange("é.txt", ChangeStatus.Added, null, file("5"), null)
    ]);
  });

  it("takes a file that became executable as modified, and one that became a link or a folder as changed in kind", () => {
    const before = listingOf({ "run.sh": file("1"), "out": file("2"), "lib": file("3") });
    const after = listingOf({ "run.sh": new TreeFile(EntryKind.Executable, "1"), "out": new TreeFile(EntryKind.Link, "2"), "lib/x.ts": file("4") });

    assert.deepEqual(ListingComparer.compare(before, after).map(t => [t.path, t.status]), [
      ["lib", ChangeStatus.KindChanged], ["lib/x.ts", ChangeStatus.Added], ["out", ChangeStatus.KindChanged], ["run.sh", ChangeStatus.Modified]
    ]);
  });

  it("finds an empty folder added or deleted, and none for a folder that's on both sides", () => {
    const before = listingOf({ "src/a.ts": file("1") }, ["old"]);
    const after = listingOf({ "src/a.ts": file("1") }, ["new", "src"]);

    assert.deepEqual(ListingComparer.compare(before, after), [
      new PendingChange("new", ChangeStatus.Added, null, SideFolder.Instance, null),
      new PendingChange("old", ChangeStatus.Deleted, SideFolder.Instance, null, null)
    ]);
  });

  it("takes a path either side couldn't read as unknown, with that side's reason, and nothing below a folder it couldn't read", () => {
    const before = listingOf({ "closed/a.txt": file("1"), "closed/b.txt": file("2"), "busy.log": file("3") }, [],
      [new UnreadPath("gone", UnreadReason.Denied, null), new UnreadPath("lost.txt", UnreadReason.Denied, null)]);
    const after = listingOf({ "gone/x.txt": file("4") }, [], [new UnreadPath("closed", UnreadReason.Denied, null), new UnreadPath("busy.log", UnreadReason.Changing, null)]);

    assert.deepEqual(ListingComparer.compare(before, after), [
      new PendingChange("busy.log", ChangeStatus.Unknown, file("3"), null, UnreadReason.Changing),
      new PendingChange("closed", ChangeStatus.Unknown, SideFolder.Instance, null, UnreadReason.Denied),
      new PendingChange("gone", ChangeStatus.Unknown, null, SideFolder.Instance, UnreadReason.Denied),
      new PendingChange("lost.txt", ChangeStatus.Unknown, null, null, UnreadReason.Denied)
    ]);
  });

  it("leaves out on both sides a path either side's rules ignore, itself or a folder above it", () => {
    const rules = new IgnoreRules(false);
    rules.addFile(new IgnoreFile("", Buffer.from("*.log\nbuild/\n"), false));
    const following = listingOf({ "a.txt": file("1") }, [], [], rules);
    const every = listingOf({ "a.txt": file("1"), "a.log": file("2"), "build/out.js": file("3") });

    assert.deepEqual([ListingComparer.compare(following, every), ListingComparer.compare(every, following)], [[], []]);
  });
});
