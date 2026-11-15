/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import { describe, it } from "node:test";

import { CheckpointsContext } from "../fixtures/checkpoints-context.fixture.ts";
import { ScheduleFixture } from "../fixtures/schedule.fixture.ts";

describe("HousekeepingSchedule", { concurrency: true }, () => {
  const delay = ScheduleFixture.delay;

  it("aborts a running pass when a request comes, which waits only for the pass to stop, and runs it again after the request", async () => {
    const fixture = new ScheduleFixture();
    const passes = fixture.passes;
    passes.passAsync = signal => new Promise((_resolve, reject) => {
      passes.passAsync = async () => true;
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
    await fixture.requestAsync(true);
    await fixture.elapseAsync(delay);
    assert.equal(passes.signals.length, 1);

    await fixture.requestAsync(false);
    assert.equal(passes.signals[0]?.aborted, true);
    await fixture.elapseAsync(delay);

    assert.equal(passes.signals.length, 2);
    assert.equal(passes.signals[1]?.aborted, false);
    await fixture.schedule.stopAsync();
  });

  it("runs a folder's pass once the delay passes after a request that writes, and none after one that only reads", async () => {
    const fixture = new ScheduleFixture();

    await fixture.requestAsync(false);
    await fixture.elapseAsync(delay * 3);
    assert.equal(fixture.passes.signals.length, 0);

    await fixture.requestAsync(true);
    await fixture.elapseAsync(delay - 1);
    assert.equal(fixture.passes.signals.length, 0);
    await fixture.elapseAsync(1);
    assert.equal(fixture.passes.signals.length, 1);

    await fixture.requestAsync(false);
    await fixture.elapseAsync(delay * 3);
    assert.equal(fixture.passes.signals.length, 1);
    await fixture.schedule.stopAsync();
  });

  it("writes a pass that fails to the module's log, and runs none again until the folder writes again", async () => {
    const fixture = new ScheduleFixture();
    fixture.passes.passAsync = async () => {
      throw new Error("the store is locked");
    };

    await fixture.requestAsync(true);
    await fixture.elapseAsync(delay);
    await fixture.requestAsync(false);
    await fixture.elapseAsync(delay * 3);
    assert.equal(fixture.passes.signals.length, 1);
    assert.deepEqual(CheckpointsContext.messagesOf(fixture.log), ["Packing the store of the folder a failed: the store is locked"]);

    await fixture.requestAsync(true);
    await fixture.elapseAsync(delay);
    assert.equal(fixture.passes.signals.length, 2);
    await fixture.schedule.stopAsync();
  });

  it("writes a pass that fails for a reason other than its abort to the module's log, though the abort came first", async () => {
    const fixture = new ScheduleFixture();
    fixture.passes.passAsync = signal => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new Error("the store broke while it stopped")), { once: true });
    });
    await fixture.requestAsync(true);
    await fixture.elapseAsync(delay);

    await fixture.schedule.stopAsync();

    assert.deepEqual([fixture.passes.signals[0]?.aborted, CheckpointsContext.messagesOf(fixture.log)], [true, ["Packing the store of the folder a failed: the store broke while it stopped"]]);
  });

  it("puts the pass off while requests come, and starts its delay only once no request for the folder is open", async () => {
    const fixture = new ScheduleFixture();
    const { promise: held, resolve: release } = Promise.withResolvers<void>();

    const open = fixture.schedule.runAsync(fixture.store, "a", false, () => held);
    await fixture.requestAsync(true);
    await fixture.elapseAsync(delay * 3);
    assert.equal(fixture.passes.signals.length, 0);
    release();
    await open;

    for (let i = 0; i < 3; i++) {
      await fixture.elapseAsync(delay - 1);
      await fixture.requestAsync(false);
    }
    await fixture.elapseAsync(delay - 1);
    assert.equal(fixture.passes.signals.length, 0);
    await fixture.elapseAsync(1);
    assert.equal(fixture.passes.signals.length, 1);
    await fixture.schedule.stopAsync();
  });

  it("stops every timer and aborts every pass, ending once each has ended, and starts none after", async () => {
    const fixture = new ScheduleFixture();
    const ended: string[] = [];
    const { promise: stopping, resolve: stop } = Promise.withResolvers<void>();
    fixture.passes.passAsync = signal => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => stopping.then(() => {
        ended.push("pass");
        reject(signal.reason);
      }), { once: true });
    });
    await fixture.requestAsync(true);
    await fixture.elapseAsync(delay);

    const stopped = fixture.schedule.stopAsync().then(() => ended.push("stopped"));
    await setImmediate();
    assert.deepEqual([ended, fixture.passes.signals[0]?.aborted], [[], true]);
    stop();
    await stopped;
    await fixture.requestAsync(true);
    await fixture.elapseAsync(delay * 3);

    assert.deepEqual(ended, ["pass", "stopped"]);
    assert.equal(fixture.passes.signals.length, 1);
  });

  it("runs no pass once stopped while a folder's delay is pending", async () => {
    const fixture = new ScheduleFixture();

    await fixture.requestAsync(true);
    await fixture.schedule.stopAsync();
    await fixture.elapseAsync(ScheduleFixture.delay * 3);

    assert.equal(fixture.passes.signals.length, 0);
  });
});
