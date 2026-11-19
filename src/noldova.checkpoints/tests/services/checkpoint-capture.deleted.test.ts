/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { CaptureOutcome } from "@noldova/checkpoints.protocol";

import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";
import { ListingFixture } from "../fixtures/listing.fixture.ts";

describe("CheckpointCapture on a folder deleted while it walks", () => {
  it("reports a folder deleted while it is walked as missing, and takes no checkpoint", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("sub/a.txt", "a");
    await harness.writeAsync("z.txt", "z");
    ListingFixture.beforeListing(t, [() => path.join(harness.folder, "sub"), async () => await rm(harness.folder, { recursive: true })]);

    const result = await harness.captureAsync(null);

    assert.deepEqual([result.outcome, result.checkpoint], [CaptureOutcome.FolderMissing, null]);
    assert.deepEqual(await harness.listAsync(), []);
  });
});
