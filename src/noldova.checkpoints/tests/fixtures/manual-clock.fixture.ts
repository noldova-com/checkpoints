/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { setImmediate } from "node:timers/promises";

import { ScheduledCall } from "../../src/models/scheduled-call.ts";
import { Resources } from "../../src/resources.ts";
import { Clock } from "../../src/services/clock.ts";
import { DueCall } from "./due-call.fixture.ts";

export class ManualClock extends Clock {
  public static readonly start: number = 1_800_000_000_000;
  private static readonly scheduleTurns: number = 100;
  private readonly due: DueCall[] = [];
  private time: number;

  public constructor(time: number = ManualClock.start) {
    super();
    this.time = time;
  }

  public get pending(): readonly number[] {
    return this.due.map(t => t.at - this.time);
  }

  public override now(): number {
    return this.time;
  }

  public override fileTime(): bigint {
    return BigInt(this.time) * Resources.nanosecondsPerMillisecond;
  }

  public override elapsed(): number {
    return this.time;
  }

  public override schedule(call: () => void, milliseconds: number): ScheduledCall {
    const due = new DueCall(this.time + milliseconds, call);
    this.due.push(due);
    return new ScheduledCall(() => this.remove(due));
  }

  public async scheduledWithoutIoAsync(call: string): Promise<void> {
    for (let turn = 0; this.due.length === 0; turn++) {
      if (turn === ManualClock.scheduleTurns)
        throw new Error(`${call} wasn't scheduled on the clock within ${ManualClock.scheduleTurns} turns of the event loop.`);
      await setImmediate();
    }
  }

  public tick(milliseconds: number): void {
    const end = this.time + milliseconds;
    for (let next = this.nextBy(end); next !== undefined; next = this.nextBy(end)) {
      this.remove(next);
      this.time = next.at;
      next.call();
    }
    this.time = end;
  }

  private nextBy(end: number): DueCall | undefined {
    return this.due.filter(t => t.at <= end).reduce<DueCall | undefined>((first, t) => first === undefined || t.at < first.at ? t : first, undefined);
  }

  private remove(due: DueCall): void {
    const index = this.due.indexOf(due);
    if (index >= 0)
      this.due.splice(index, 1);
  }
}
