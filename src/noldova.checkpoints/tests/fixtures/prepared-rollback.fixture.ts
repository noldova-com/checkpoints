/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { RestoreRun } from "../../src/models/restore-run.ts";
import type { CheckpointsHarness } from "./checkpoints-harness.fixture.ts";

export class PreparedRollback {
  public readonly harness: CheckpointsHarness;
  public readonly run: RestoreRun;

  public constructor(harness: CheckpointsHarness, run: RestoreRun) {
    this.harness = harness;
    this.run = run;
  }
}
