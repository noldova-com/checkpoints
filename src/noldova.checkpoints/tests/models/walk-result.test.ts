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
import { IgnoreRules } from "../../src/models/ignore-rules.ts";
import { LinkKind } from "../../src/models/link-kind.ts";
import { LinkRecord } from "../../src/models/link-record.ts";
import { ReadFailure } from "../../src/models/read-failure.ts";
import { WalkedEntry } from "../../src/models/walked-entry.ts";
import { WalkResult } from "../../src/models/walk-result.ts";
import { FailureFixture } from "../fixtures/failure.fixture.ts";
import { StatsFixture } from "../fixtures/stats.fixture.ts";

describe("WalkResult", { concurrency: true }, () => {
  it("keeps what the walk adds, in order", () => {
    const result = new WalkResult(null);
    const entry = new WalkedEntry("a.txt", "/project/a.txt", EntryKind.File, StatsFixture.of("file", 0o100644n, 1n, 1n, 1n, 1n));
    const link = new LinkRecord("b", LinkKind.Folder);
    const unread = new UnreadPath("c", UnreadReason.InvalidName, null);

    result.addEntry(entry);
    result.addEmptyFolder("empty");
    result.addLink(link);
    result.addUnreadPath(unread);

    assert.deepEqual(result.entries, [entry]);
    assert.deepEqual(result.emptyFolders, ["empty"]);
    assert.deepEqual(result.links, [link]);
    assert.deepEqual(result.unreadPaths, [unread]);
  });

  it("keeps the paths a restore leaves as they are: each .git and ignored path in order, and each repository's folder once with those above it", () => {
    const result = new WalkResult(null);

    result.addRepositoryPath(".git");
    result.addIgnoredPath("out");
    result.addRepositoryFolder("vendor/lib");
    result.addRepositoryFolder("vendor/lib/deep");
    result.addRepositoryFolder("tools");

    assert.deepEqual(result.repositoryPaths, [".git"]);
    assert.deepEqual(result.ignoredPaths, ["out"]);
    assert.deepEqual([...result.repositoryFolders], ["vendor/lib", "vendor", "vendor/lib/deep", "tools"]);
  });

  it("keeps the rules a walk that follows the ignore files is given, and none for one that doesn't", () => {
    const rules = new IgnoreRules(false);

    assert.equal(new WalkResult(rules).rules, rules);
    assert.equal(new WalkResult(null).rules, null);
  });

  it("lists a path the system wouldn't let the walk read, and says it did", () => {
    const result = new WalkResult(null);

    assert.equal(result.addFailure("locked", ReadFailure.Denied), true);
    assert.deepEqual(result.unreadPaths, [new UnreadPath("locked", UnreadReason.Denied, null)]);
  });

  it("lists a path it couldn't read for another reason with the system's code", () => {
    const result = new WalkResult(null);

    assert.equal(result.addFailure("share/report.pdf", ReadFailure.of(new FailureFixture("timed out", "ETIMEDOUT", -110))), true);
    assert.deepEqual(result.unreadPaths, [new UnreadPath("share/report.pdf", UnreadReason.Unreadable, "ETIMEDOUT")]);
  });

  it("leaves out a path that went away, and says it did", () => {
    const result = new WalkResult(null);

    assert.equal(result.addFailure("gone", ReadFailure.Gone), false);
    assert.deepEqual(result.unreadPaths, []);
  });
});
