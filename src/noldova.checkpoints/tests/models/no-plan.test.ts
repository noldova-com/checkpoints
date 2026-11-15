/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PreviewOutcome, RestoreOutcome } from "@noldova/checkpoints.protocol";

import { NoPlan } from "../../src/models/no-plan.ts";

describe("NoPlan", { concurrency: true }, () => {
  it("gives the preview's and the restore's outcome of the same name for each reason there is no plan", () => {
    assert.deepEqual([NoPlan.CheckpointMissing, NoPlan.FolderMissing, NoPlan.HeldUp].map(t => [t.preview, t.restore]), [
      [PreviewOutcome.CheckpointMissing, RestoreOutcome.CheckpointMissing],
      [PreviewOutcome.FolderMissing, RestoreOutcome.FolderMissing],
      [PreviewOutcome.HeldUp, RestoreOutcome.HeldUp]
    ]);
  });
});
