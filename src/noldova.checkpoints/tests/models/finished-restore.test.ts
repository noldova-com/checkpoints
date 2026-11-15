/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CaptureMode, Checkpoint, RestoreOutcome } from "@noldova/checkpoints.protocol";

import { FinishedRestore } from "../../src/models/finished-restore.ts";

describe("FinishedRestore", { concurrency: true }, () => {
  it("keeps how a restore ended, the checkpoint that kept what another program changed, and whether its journal is closed", () => {
    const recovered = new Checkpoint("01890a5d-ac96-774b-bcce-b302099a8059", new Date(0), CaptureMode.EveryFile, "Recovered after restore", []);

    const finished = new FinishedRestore(RestoreOutcome.Restored, recovered, false);

    assert.deepEqual([finished.outcome, finished.recovered, finished.isClosed], [RestoreOutcome.Restored, recovered, false]);
  });
});
