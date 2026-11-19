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

import { RestoreRequest, type Checkpoint } from "@noldova/checkpoints.protocol";

import { CancelFixture } from "../fixtures/cancel.fixture.ts";
import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";

describe("CheckpointsHost's restore cancelled after its checkpoint before it", () => {
  const names: readonly string[] = ["a.txt", "b.txt", "c.txt", "d.txt"];

  const changedAsync = async (harness: CheckpointsHarness): Promise<Checkpoint> => {
    for (const name of names)
      await harness.writeAsync(name, name);
    const checkpoint = await harness.checkpointAsync(null);
    for (const name of names)
      await harness.writeAsync(name, `${name} 2`);
    return checkpoint;
  };

  it("stops a restore cancelled once its checkpoint before it is taken, before its journal, keeping that checkpoint and changing nothing", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const first = await changedAsync(harness);
    const plan = await harness.planAsync(first);
    const changed = await harness.snapshotAsync();
    const cancel = new CancelFixture(t);
    harness.context.watchInput = (command, chunk) => {
      if (command === "fast-import" && chunk.includes("get-mark"))
        harness.context.started.findLast(u => u.command === "fast-import")?.owned.output.once("readable", () => cancel.cancel());
    };

    await assert.rejects(harness.service.restoreAsync(new RestoreRequest(harness.reference, plan), cancel.signal), cancel.reason);

    assert.deepEqual(await harness.snapshotAsync(), changed);
    assert.equal(existsSync(path.join(harness.store, "restore.json")), false);
    const listed = await harness.listAsync();
    assert.deepEqual(listed.map(u => u.label), ["Before restore", first.label]);
    const [before] = listed;
    assert.ok(before);
    assert.equal((await harness.contentAsync(before, "files/a.txt")).toString(), "a.txt 2");
    assert.deepEqual(harness.context.running, []);
  });
});
