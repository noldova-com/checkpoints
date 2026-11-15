/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ScheduledCall } from "../models/scheduled-call.ts";
import { Resources } from "../resources.ts";

export class Clock {
  public static readonly system: Clock = new Clock();

  public now(): number {
    return Date.now();
  }

  public fileTime(): bigint {
    return BigInt(Date.now()) * Resources.nanosecondsPerMillisecond;
  }

  public elapsed(): number {
    return performance.now();
  }

  public schedule(call: () => void, milliseconds: number): ScheduledCall {
    const timer = setTimeout(call, milliseconds).unref();
    return new ScheduledCall(() => clearTimeout(timer));
  }
}
