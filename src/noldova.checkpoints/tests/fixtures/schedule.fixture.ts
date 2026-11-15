/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { setImmediate } from "node:timers/promises";
import { FakeModuleLog } from "@noldova/desktop.runtime/testing";

import { FolderStore } from "../../src/models/folder-store.ts";
import { FolderQueue } from "../../src/services/folder-queue.ts";
import { HousekeepingSchedule } from "../../src/services/housekeeping-schedule.ts";

import { ManualClock } from "./manual-clock.fixture.ts";
import { PassFixture } from "./pass.fixture.ts";

export class ScheduleFixture {
  public static readonly delay: number = 30_000;
  public readonly clock: ManualClock = new ManualClock();
  public readonly passes: PassFixture = new PassFixture();
  public readonly log: FakeModuleLog = new FakeModuleLog();
  public readonly queue: FolderQueue = new FolderQueue();
  public readonly store: FolderStore = new FolderStore("/module", "a");
  public readonly schedule: HousekeepingSchedule;
  private readonly uncancelled: AbortSignal = new AbortController().signal;

  public constructor() {
    this.schedule = new HousekeepingSchedule(this.queue, this.passes, this.log, this.clock);
  }

  public async requestAsync(writes: boolean, operation: () => Promise<void> = async () => undefined): Promise<void> {
    await this.schedule.runAsync(this.store, "a", writes, () => this.queue.runAsync("a", operation, this.uncancelled));
  }

  public async elapseAsync(milliseconds: number): Promise<void> {
    this.clock.tick(milliseconds);
    await setImmediate();
  }
}
