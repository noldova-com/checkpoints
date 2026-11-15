/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { setImmediate } from "node:timers/promises";

import { RestoreOutcome } from "@noldova/checkpoints.protocol";

import { JournalRecordType } from "../../src/models/journal-record-type.ts";
import { FolderFileReader } from "../../src/services/folder-file.reader.ts";
import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";
import { FailureFixture } from "../fixtures/failure.fixture.ts";
import { RestoreFolder } from "../fixtures/restore-folder.fixture.ts";
import { ScriptedJournal } from "../fixtures/scripted-journal.fixture.ts";
import { ServiceSeams } from "../fixtures/service-seams.fixture.ts";

describe("RestoreRunner's retries", () => {
  it("restores a planned file whose read for the compare fails once while another program holds it", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "a");
    const checkpoint = await harness.checkpointAsync(null);
    await harness.writeAsync("f.txt", "f");
    const plan = await harness.planAsync(checkpoint);
    let aside = "";
    let failed = 0;
    const { promise: refused, resolve: refuse } = Promise.withResolvers<void>();
    const objectIdOfAsync = FolderFileReader.objectIdOfAsync;
    t.mock.method(FolderFileReader, "objectIdOfAsync", async (location: string, isLink: boolean) => {
      if (location === aside && failed++ === 0) {
        refuse();
        throw new FailureFixture("EBUSY: resource busy or locked", "EBUSY");
      }
      return await objectIdOfAsync(location, isLink);
    });
    const service = await harness.createServiceAsync(ServiceSeams.system.withJournals(file => new ScriptedJournal(file, async record => {
      if (record.type === JournalRecordType.Aside)
        aside = await RestoreFolder.of(harness).asideOfAsync("f.txt");
    })));
    t.mock.timers.enable({ apis: ["setTimeout"] });

    const restoring = harness.restoreAsync(plan, service);
    await refused;
    await setImmediate();
    t.mock.timers.tick(99);
    await setImmediate();
    const early = failed;
    t.mock.timers.tick(1);
    t.mock.timers.reset();
    const result = await restoring;

    assert.deepEqual([early, result.outcome, failed, await RestoreFolder.existsAsync(path.join(harness.folder, "f.txt"))], [1, RestoreOutcome.Restored, 2, false]);
    await RestoreFolder.of(harness).assertCleanAsync();
  });
});
