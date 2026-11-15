/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Clock } from "../../src/services/clock.ts";

describe("Clock", { concurrency: true }, () => {
  it("runs a scheduled call once its time has passed, and never one cancelled first", async () => {
    const calls: string[] = [];
    const { promise: ran, resolve } = Promise.withResolvers<void>();

    Clock.system.schedule(() => calls.push("cancelled"), 0).cancel();
    Clock.system.schedule(() => {
      calls.push("kept");
      resolve();
    }, 0);
    await ran;

    assert.deepEqual(calls, ["kept"]);
  });

  it("gives the time in whole milliseconds, the file time in nanoseconds of a whole millisecond, and an elapsed time that never goes back", () => {
    const first = Clock.system.elapsed();
    const second = Clock.system.elapsed();

    assert.deepEqual([Number.isInteger(Clock.system.now()), Clock.system.fileTime() % 1_000_000n, second >= first], [true, 0n, true]);
  });
});
