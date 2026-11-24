/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "@noldova/context.core";

import type { ScheduledCall } from "../models/scheduled-call.ts";
import type { Clock } from "./clock.ts";

export class CommandDeadline {
  private readonly limit: AbortController = new AbortController();
  private readonly milliseconds: number;
  private readonly clock: Clock;
  private timer: ScheduledCall | undefined;

  public readonly signal: AbortSignal;

  public constructor(signal: AbortSignal, milliseconds: number, clock: Clock) {
    this.clock = clock;
    this.milliseconds = milliseconds;
    this.signal = AbortSignal.any([signal, this.limit.signal]);
    this.timer = this.start();
  }

  public clear(): void {
    this.timer?.cancel();
    this.timer = undefined;
  }

  public restart(): void {
    if (Object.isUndefined(this.timer))
      return;
    this.timer.cancel();
    this.timer = this.start();
  }

  private start(): ScheduledCall {
    return this.clock.schedule(() => this.limit.abort(), this.milliseconds);
  }
}
