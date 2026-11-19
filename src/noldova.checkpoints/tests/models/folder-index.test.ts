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

import { UnsupportedStoreFormatException } from "../../src/api/index.ts";
import { EntryKind } from "../../src/models/entry-kind.ts";
import { FolderIndex } from "../../src/models/folder-index.ts";
import { IndexEntry } from "../../src/models/index-entry.ts";
import { WalkedEntry } from "../../src/models/walked-entry.ts";
import { StatsFixture } from "../fixtures/stats.fixture.ts";

describe("FolderIndex", { concurrency: true }, () => {
  const objectId = "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391";
  const second = 1_000_000_000n;
  const walked = (path: string, modified: bigint): WalkedEntry =>
    new WalkedEntry(path, `/project/${path}`, EntryKind.File, StatsFixture.of("file", 0o100644n, 0n, modified, modified, 1n));

  it("vouches for a file the walk found as it left it, more than two seconds before the last capture started", () => {
    const index = new FolderIndex(10n * second, [IndexEntry.of(walked("a.txt", 7n * second), objectId)]);

    assert.equal(index.findUnchanged(walked("a.txt", 7n * second))?.objectId, objectId);
  });

  it("finds the entry it holds for a path, changed or not, and none for a path it doesn't know", () => {
    const index = new FolderIndex(10n * second, [IndexEntry.of(walked("a.txt", 9n * second), objectId)]);

    assert.equal(index.find("a.txt")?.objectId, objectId);
    assert.equal(index.find("b.txt"), null);
    assert.equal(FolderIndex.Empty.find("a.txt"), null);
  });

  it("vouches for no file it doesn't know, nor one written within two seconds of the last capture's start", () => {
    const index = new FolderIndex(10n * second, [IndexEntry.of(walked("a.txt", 8n * second), objectId)]);

    assert.equal(index.findUnchanged(walked("a.txt", 8n * second)), null);
    assert.equal(index.findUnchanged(walked("b.txt", 7n * second)), null);
    assert.equal(FolderIndex.Empty.findUnchanged(walked("a.txt", 7n * second)), null);
  });

  it("writes and reads its start and entries, with its format version", () => {
    const index = new FolderIndex(1760000000123456789n, [IndexEntry.of(walked("a.txt", 1n), objectId)]);
    const json = index.toJson();

    assert.equal(json["formatVersion"], 1);
    assert.equal(json["start"], "1760000000123456789");
    assert.deepEqual(FolderIndex.fromJson(json).toJson(), json);
    assert.deepEqual(FolderIndex.fromJson(json).entries.map(t => t.path), ["a.txt"]);
  });

  it("refuses an index of a format version it doesn't read", () => {
    assert.throws(() => FolderIndex.fromJson({ formatVersion: 2, start: "0", entries: [] }),
      new UnsupportedStoreFormatException("2"));
    assert.throws(() => FolderIndex.fromJson({ formatVersion: 1, start: "0", entries: [], more: [] }), new JsonException("The field is not part of this record, which accepts no unknown fields.", "FolderIndex.more"));
  });
});
