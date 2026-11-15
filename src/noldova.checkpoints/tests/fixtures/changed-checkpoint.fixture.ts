/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { Checkpoint } from "@noldova/checkpoints.protocol";

import type { CheckpointsHarness } from "./checkpoints-harness.fixture.ts";

export class ChangedCheckpoint {
  public readonly checkpoint: Checkpoint;
  public readonly harness: CheckpointsHarness;
  public readonly objectId: string;

  public constructor(harness: CheckpointsHarness, checkpoint: Checkpoint, objectId: string) {
    this.checkpoint = checkpoint;
    this.harness = harness;
    this.objectId = objectId;
  }
}
