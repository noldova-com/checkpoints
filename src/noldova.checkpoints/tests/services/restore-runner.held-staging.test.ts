/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { CaptureOutcome, RestoreOutcome } from "@noldova/checkpoints.protocol";

import { BlobStager } from "../../src/services/blob-stager.ts";
import { AccessFixture } from "../fixtures/access.fixture.ts";
import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";
import { FailureFixture } from "../fixtures/failure.fixture.ts";
import { PreparedRestore } from "../fixtures/prepared-restore.fixture.ts";
import { RestoreFolder } from "../fixtures/restore-folder.fixture.ts";

describe("RestoreRunner, staging held", () => {
  it("holds the folder up when a restore that fails while staging can't remove what it staged, and removes it once it can",
    { skip: AccessFixture.isRoot ? "root reads past any file mode" : false }, async t => {
      const harness = await CheckpointsHarness.startAsync(t);
      const { checkpoint } = await PreparedRestore.prepareAsync(harness);
      const plan = await harness.planAsync(checkpoint);
      const now = await harness.snapshotAsync();
      let held = "";
      const stageAsync = BlobStager.prototype.stageAsync;
      t.mock.method(BlobStager.prototype, "stageAsync", async function (this: BlobStager, ...staged: Parameters<BlobStager["stageAsync"]>): Promise<void> {
        await stageAsync.apply(this, staged);
        held = path.join(harness.folder, await RestoreFolder.of(harness).stagingAsync(), "held");
        await mkdir(held);
        await writeFile(path.join(held, "x.txt"), "held by another program");
        await AccessFixture.denyRemovingAsync(held);
        throw new FailureFixture("ENOSPC: no space left on device", "ENOSPC");
      });

      try {
        const result = await harness.restoreAsync(plan);

        assert.equal(result.outcome, RestoreOutcome.HeldUp);
        assert.equal((await harness.captureAsync(null)).outcome, CaptureOutcome.HeldUp);
        assert.deepEqual(harness.context.events.get("checkpoints.restoreHeldUp")?.at(-1), { identity: CheckpointsHarness.identity, paths: [path.basename(path.dirname(held))] });

        await AccessFixture.allowRemovingAsync(held);
        assert.equal((await harness.captureAsync(null)).outcome, CaptureOutcome.Captured);
        assert.deepEqual(await harness.snapshotAsync(), now);
        await RestoreFolder.of(harness).assertCleanAsync();
      }
      finally {
        if (held !== "" && await RestoreFolder.existsAsync(held))
          await AccessFixture.allowRemovingAsync(held);
      }
    });
});
