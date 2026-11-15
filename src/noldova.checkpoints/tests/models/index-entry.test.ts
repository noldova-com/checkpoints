/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { JsonException } from "@noldova/context.json";

import { UnknownEntryKindException } from "../../src/api/index.ts";
import { EntryKind } from "../../src/models/entry-kind.ts";
import { IndexEntry } from "../../src/models/index-entry.ts";
import { WalkedEntry } from "../../src/models/walked-entry.ts";
import { StatsFixture } from "../fixtures/stats.fixture.ts";

describe("IndexEntry", { concurrency: true }, () => {
  const objectId = "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391";
  const json = {
    path: "src/a.txt",
    kind: "Executable",
    size: "12",
    modified: "1760000000123456789",
    changed: "1760000000987654321",
    fileId: "7:42",
    objectId
  };
  const walked = (size: bigint, modified: bigint, changed: bigint, inode: bigint, kind: EntryKind = EntryKind.File): WalkedEntry =>
    new WalkedEntry("a.txt", "/project/a.txt", kind, StatsFixture.of("file", 0o100644n, size, modified, changed, inode));

  it("keeps times in nanoseconds as decimal text, which JSON numbers can't hold exactly", () => {
    const entry = IndexEntry.fromJson(json);

    assert.equal(entry.modified, 1760000000123456789n);
    assert.equal(entry.changed, 1760000000987654321n);
    assert.equal(entry.size, 12);
    assert.equal(entry.kind, EntryKind.Executable);
    assert.deepEqual(entry.toJson(), json);
  });

  it("takes what the walk read, with the object holding its content", () => {
    const entry = IndexEntry.of(walked(5n, 10n, 20n, 42n), objectId);

    assert.deepEqual(entry.toJson(), { path: "a.txt", kind: "File", size: "5", modified: "10", changed: "20", fileId: "7:42", objectId });
  });

  it("matches an entry the walk found as it left it, before the racy window", () => {
    const entry = IndexEntry.of(walked(5n, 10n, 20n, 42n), objectId);

    assert.equal(entry.matches(walked(5n, 10n, 20n, 42n), 21n), true);
    assert.equal(entry.matches(walked(5n, 10n, 20n, 42n, EntryKind.Executable), 21n), false);
    assert.equal(entry.matches(walked(6n, 10n, 20n, 42n), 21n), false);
    assert.equal(entry.matches(walked(5n, 11n, 20n, 42n), 21n), false);
    assert.equal(entry.matches(walked(5n, 10n, 21n, 42n), 22n), false);
    assert.equal(entry.matches(walked(5n, 10n, 20n, 43n), 21n), false);
  });

  it("never matches an entry whose modification or change time falls in the racy window", () => {
    const entry = IndexEntry.of(walked(5n, 10n, 20n, 42n), objectId);

    assert.equal(entry.matches(walked(5n, 10n, 20n, 42n), 10n), false);
    assert.equal(entry.matches(walked(5n, 10n, 20n, 42n), 20n), false);
  });

  it("refuses an entry that isn't what the module wrote", () => {
    assert.throws(() => IndexEntry.fromJson({ ...json, extra: 1 }), new JsonException("The field is not part of this message, which accepts no unknown fields.", "IndexEntry.extra"));
    assert.throws(() => IndexEntry.fromJson({ ...json, kind: "Socket" }), new UnknownEntryKindException("Socket"));
    assert.throws(() => IndexEntry.fromJson({ ...json, modified: "soon" }), SyntaxError);
    assert.throws(() => IndexEntry.fromJson({ ...json, size: "1.5" }), SyntaxError);
  });
});
