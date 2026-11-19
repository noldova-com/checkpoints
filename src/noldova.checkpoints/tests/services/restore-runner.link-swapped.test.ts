/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import type { BigIntStats } from "node:fs";
import { lstat, lutimes, readlink, symlink, unlink } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { RestoreOutcome } from "@noldova/checkpoints.protocol";

import type { JournalRecord } from "../../src/models/journal-record.ts";
import { RestorePaths } from "../../src/services/restore-paths.ts";
import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";
import { LinkFixture } from "../fixtures/link.fixture.ts";
import { RestoreFolder } from "../fixtures/restore-folder.fixture.ts";
import { ScriptedJournal } from "../fixtures/scripted-journal.fixture.ts";
import { ServiceSeams } from "../fixtures/service-seams.fixture.ts";

const withoutLinks = await LinkFixture.withoutLinksAsync();

const onFirstAside = (harness: CheckpointsHarness, relativePath: string, changeAsync: (location: string, aside: string) => Promise<void>): (record: JournalRecord) => Promise<void> =>
  RestoreFolder.of(harness).onFirstAside(relativePath, changeAsync);

const time = RestoreFolder.time;

describe("RestoreRunner on a link another program swaps", () => {
  it("rolls back, keeping the link, when another program puts in place of a planned link one to another target with its size, modified time and file id", { skip: withoutLinks }, async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "a");
    const checkpoint = await harness.checkpointAsync(null);
    await harness.writeAsync("first.txt", "first");
    await harness.writeAsync("fifth.txt", "fifth");
    const out = path.join(harness.folder, "out");
    await LinkFixture.symlinkAsync("first.txt", out, "file");
    await lutimes(out, time, time);
    const plan = await harness.planAsync(checkpoint);
    let swapped: BigIntStats | null = null;
    let movedAside = "";
    const lstatAsync = RestorePaths.lstatAsync;
    t.mock.method(RestorePaths, "lstatAsync", async (location: string) => {
      const stats = await lstatAsync(location);
      if (stats === null || swapped === null || location !== movedAside)
        return stats;
      stats.dev = swapped.dev;
      stats.ino = swapped.ino;
      return stats;
    });
    const swapAsync = onFirstAside(harness, "out", async (u, aside) => {
      swapped = await lstat(u, { bigint: true });
      movedAside = aside;
      await unlink(u);
      await symlink("fifth.txt", u, "file");
      await lutimes(u, time, time);
    });
    const service = await harness.createServiceAsync(ServiceSeams.system.withJournals(file => new ScriptedJournal(file, swapAsync)));

    const result = await harness.restoreAsync(plan, service);

    assert.equal(result.outcome, RestoreOutcome.RolledBack);
    assert.equal(await readlink(out), "fifth.txt");
    assert.equal(Buffer.from((await harness.readAsync(RestoreFolder.presentOf(result.before), "out", null)).content).toString("utf8"), "first.txt");
    await RestoreFolder.of(harness).assertCleanAsync();
  });
});
