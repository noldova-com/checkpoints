/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  RestoreOutcome,
  RestoreRequest,
  type Checkpoint,
  type RestoreResult
} from "@noldova/checkpoints.protocol";

import { CancelFixture } from "../fixtures/cancel.fixture.ts";
import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";

describe("CheckpointsHost's restore cancelled around its journal", () => {
  const names: readonly string[] = ["a.txt", "b.txt", "c.txt", "d.txt"];

  const changedAsync = async (harness: CheckpointsHarness): Promise<Checkpoint> => {
    for (const name of names)
      await harness.writeAsync(name, name);
    const checkpoint = await harness.checkpointAsync(null);
    for (const name of names)
      await harness.writeAsync(name, `${name} 2`);
    return checkpoint;
  };

  it("stops a restore cancelled before it writes its journal, changing nothing, and carries one cancelled after to its end", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    for (const name of names)
      await harness.writeAsync(name, name);
    const original = await harness.snapshotAsync();
    const first = await changedAsync(harness);
    const plan = await harness.planAsync(first);
    const changed = await harness.snapshotAsync();
    const journal = path.join(harness.store, "restore.json");
    const restoreAsync = (signal: AbortSignal): Promise<RestoreResult> => harness.service.restoreAsync(new RestoreRequest(harness.reference, plan), signal);
    const early = new CancelFixture(t);
    const late = new CancelFixture(t);

    harness.context.watchInput = command => {
      if (command === "fast-import")
        early.cancel();
    };
    await assert.rejects(restoreAsync(early.signal), early.reason);
    assert.deepEqual(await harness.snapshotAsync(), changed);
    assert.equal(existsSync(journal), false);
    assert.deepEqual((await harness.listAsync()).map(u => u.id), [first.id]);
    assert.deepEqual(harness.context.running, []);

    harness.context.watchInput = () => undefined;
    harness.context.watchStart = command => {
      if (command === "cat-file" && existsSync(journal))
        late.cancel();
    };
    const restored = await restoreAsync(late.signal);

    assert.equal(late.signal.aborted, true);
    assert.equal(restored.outcome, RestoreOutcome.Restored);
    assert.deepEqual(await harness.snapshotAsync(), original);
    assert.equal(existsSync(journal), false);
    assert.deepEqual(harness.context.running, []);
  });
});
