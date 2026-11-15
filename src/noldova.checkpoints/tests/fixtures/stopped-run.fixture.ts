/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { UpdateProcess } from "@noldova/desktop.protocol";

import { CheckpointsHarness } from "./checkpoints-harness.fixture.ts";
import type { ICleanups } from "./i-cleanups.fixture.ts";
import { PreparedRestore } from "./prepared-restore.fixture.ts";
import type { StopPoint } from "./stop-point.fixture.ts";
import { StoppedRestore } from "./stopped-restore.fixture.ts";

export class StoppedRun {
  public readonly harness: CheckpointsHarness;
  public readonly now: Awaited<ReturnType<CheckpointsHarness["snapshotAsync"]>>;
  public readonly prepared: PreparedRestore;
  public readonly started: readonly UpdateProcess[];

  public constructor(harness: CheckpointsHarness, prepared: PreparedRestore, now: Awaited<ReturnType<CheckpointsHarness["snapshotAsync"]>>, started: readonly UpdateProcess[]) {
    this.harness = harness;
    this.now = now;
    this.prepared = prepared;
    this.started = started;
  }

  public static async stopAsync(t: ICleanups, stop: StopPoint, action: string = "none"): Promise<StoppedRun> {
    const harness = await CheckpointsHarness.startAsync(t);
    const prepared = await PreparedRestore.prepareAsync(harness);
    const plan = await harness.planAsync(prepared.checkpoint);
    const now = await harness.snapshotAsync();
    return new StoppedRun(harness, prepared, now, await StoppedRestore.stopAsync(harness, plan, stop, action));
  }
}
