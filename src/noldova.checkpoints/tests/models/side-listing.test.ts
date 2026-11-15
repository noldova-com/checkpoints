/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { UnreadPath, UnreadReason } from "@noldova/checkpoints.protocol";

import { EntryKind } from "../../src/models/entry-kind.ts";
import { IgnoreFile } from "../../src/models/ignore-file.ts";
import { IgnoreRules } from "../../src/models/ignore-rules.ts";
import { SideFolder } from "../../src/models/side-folder.ts";
import { SideListing } from "../../src/models/side-listing.ts";
import { TreeFile } from "../../src/models/tree-file.ts";

describe("SideListing", { concurrency: true }, () => {
  const file = new TreeFile(EntryKind.File, "id-1");
  const listing = new SideListing(new Map([["src/lib/a.ts", file], ["b.txt", file]]), ["logs/old"],
    [new UnreadPath("closed", UnreadReason.Denied, null), new UnreadPath("src/busy.log", UnreadReason.Changing, null)], null);

  it("names each file, empty folder and path it couldn't read", () => {
    assert.deepEqual(listing.paths, ["src/lib/a.ts", "b.txt", "logs/old", "closed", "src/busy.log"]);
    assert.deepEqual(listing.emptyFolders, ["logs/old"]);
  });

  it("holds a file at its path, a folder above a file or an empty folder, and nothing elsewhere", () => {
    assert.equal(listing.entryOf("b.txt"), file);
    assert.deepEqual(["src", "src/lib", "logs", "logs/old"].map(u => listing.entryOf(u)), [SideFolder.Instance, SideFolder.Instance, SideFolder.Instance, SideFolder.Instance]);
    assert.deepEqual(["src/lib/a", "closed", "none"].map(u => listing.entryOf(u)), [null, null, null]);
  });

  it("gives why it couldn't read a path, or a folder above it", () => {
    assert.deepEqual(["closed", "closed/x/y.txt", "src/busy.log", "src/lib/a.ts", "closedness"].map(u => listing.unreadReasonOf(u)),
      [UnreadReason.Denied, UnreadReason.Denied, UnreadReason.Changing, null, null]);
  });

  it("is under an unread folder only below one, not at it", () => {
    assert.deepEqual(["closed/x", "closed/x/y.txt", "closed", "src/busy.log", "b.txt"].map(u => listing.isUnderUnread(u)), [true, true, false, false, false]);
  });

  it("leaves out what its rules ignore, and nothing when it followed none", () => {
    const rules = new IgnoreRules(false);
    rules.addFile(new IgnoreFile("", Buffer.from("*.log\nbuild/\n"), false));
    const following = new SideListing(new Map(), [], [], rules);

    assert.deepEqual([following.excludes("a.log", false), following.excludes("build", true), following.excludes("build/x.js", false), following.excludes("a.txt", false)],
      [true, true, true, false]);
    assert.equal(listing.excludes("a.log", false), false);
  });
});
