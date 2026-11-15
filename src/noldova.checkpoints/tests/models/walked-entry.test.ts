/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { EntryKind } from "../../src/models/entry-kind.ts";
import { WalkedEntry } from "../../src/models/walked-entry.ts";
import { StatsFixture } from "../fixtures/stats.fixture.ts";

describe("WalkedEntry", { concurrency: true }, () => {
  const stats = StatsFixture.of("file", 0o100644n, 12n, 1_000n, 2_000n, 42n);

  it("keeps the path, the location, the kind and what the metadata said", () => {
    const entry = new WalkedEntry("src/a.txt", "/project/src/a.txt", EntryKind.File, stats);

    assert.equal(entry.path, "src/a.txt");
    assert.equal(entry.location, "/project/src/a.txt");
    assert.equal(entry.kind, EntryKind.File);
    assert.equal(entry.size, 12);
    assert.equal(entry.modified, 1_000n);
    assert.equal(entry.changed, 2_000n);
    assert.equal(entry.fileId, "7:42");
  });

  it("reads as unchanged only while its size, times and file id all stay as they were", () => {
    const entry = new WalkedEntry("a.txt", "/project/a.txt", EntryKind.File, stats);

    assert.equal(entry.isUnchanged(StatsFixture.of("file", 0o100644n, 12n, 1_000n, 2_000n, 42n)), true);
    assert.equal(entry.isUnchanged(StatsFixture.of("file", 0o100644n, 13n, 1_000n, 2_000n, 42n)), false);
    assert.equal(entry.isUnchanged(StatsFixture.of("file", 0o100644n, 12n, 1_001n, 2_000n, 42n)), false);
    assert.equal(entry.isUnchanged(StatsFixture.of("file", 0o100644n, 12n, 1_000n, 2_001n, 42n)), false);
    assert.equal(entry.isUnchanged(StatsFixture.of("file", 0o100644n, 12n, 1_000n, 2_000n, 43n)), false);
  });
});
