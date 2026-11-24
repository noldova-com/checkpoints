/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import "@noldova/context.core";
import { RestoreOutcome } from "@noldova/checkpoints.protocol";

import { JournalRecordType } from "../../src/models/journal-record-type.ts";
import { CheckpointsContext } from "../fixtures/checkpoints-context.fixture.ts";
import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";
import { ListingFixture } from "../fixtures/listing.fixture.ts";
import { RestoreFolder } from "../fixtures/restore-folder.fixture.ts";
import { ScriptedJournal } from "../fixtures/scripted-journal.fixture.ts";
import { ServiceSeams } from "../fixtures/service-seams.fixture.ts";

describe("RestoreRunner on a moved-aside folder changed during its walk", () => {
  it("finishes a restore whose moved-aside folder gained a file that is deleted after the walk that found it, before its stats are read again", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("d", "a file");
    const checkpoint = await harness.checkpointAsync(null);
    await rm(path.join(harness.folder, "d"));
    await harness.writeAsync("d/x.txt", "x");
    const plan = await harness.planAsync(checkpoint);
    let aside: string | null = null;
    ListingFixture.beforeListing(t, [() => aside, async folder => {
      await writeFile(path.join(folder, "late.txt"), "late");
      await mkdir(path.join(folder, "sub"));
    }], [() => Object.isNull(aside) ? null : path.join(aside, "sub"), async folder => await rm(path.join(path.dirname(folder), "late.txt"))]);
    const service = await harness.createServiceAsync(ServiceSeams.system.withJournals(file => new ScriptedJournal(file, async record => {
      if (record.type === JournalRecordType.Aside)
        aside = await RestoreFolder.of(harness).asideOfAsync("d");
    })));

    const result = await harness.restoreAsync(plan, service);

    assert.deepEqual([result.outcome, result.before?.label, result.recovered], [RestoreOutcome.Restored, "Before restore", null]);
    assert.equal(await readFile(path.join(harness.folder, "d"), "utf8"), "a file");
    assert.deepEqual(CheckpointsContext.messagesOf(harness.context.log).filter(u => !u.startsWith("Git started")), []);
    await RestoreFolder.of(harness).assertCleanAsync();
  });
});
