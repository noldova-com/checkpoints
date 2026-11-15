/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { RestoreResult } from "@noldova/checkpoints.protocol";

import type { CheckpointsHarness } from "./checkpoints-harness.fixture.ts";

export class AttemptedRestore {
  public readonly harness: CheckpointsHarness;
  public readonly now: Awaited<ReturnType<CheckpointsHarness["snapshotAsync"]>>;
  public readonly result: RestoreResult;

  public constructor(harness: CheckpointsHarness, now: Awaited<ReturnType<CheckpointsHarness["snapshotAsync"]>>, result: RestoreResult) {
    this.harness = harness;
    this.now = now;
    this.result = result;
  }
}
