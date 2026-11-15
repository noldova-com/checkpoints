/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CommandDeadline } from "../../src/services/command-deadline.ts";
import { ManualClock } from "../fixtures/manual-clock.fixture.ts";

describe("CommandDeadline", { concurrency: true }, () => {
  const uncancelled = new AbortController().signal;

  it("aborts its signal once its time passes, and not a millisecond before", () => {
    const clock = new ManualClock();
    const deadline = new CommandDeadline(uncancelled, 1000, clock);

    clock.tick(999);
    const before = deadline.signal.aborted;
    clock.tick(1);

    assert.deepEqual([before, deadline.signal.aborted], [false, true]);
  });

  it("counts its time again from each restart", () => {
    const clock = new ManualClock();
    const deadline = new CommandDeadline(uncancelled, 1000, clock);

    clock.tick(600);
    deadline.restart();
    clock.tick(999);
    const before = deadline.signal.aborted;
    clock.tick(1);

    assert.deepEqual([before, deadline.signal.aborted], [false, true]);
  });

  it("never aborts once cleared, even when restarted after", () => {
    const clock = new ManualClock();
    const deadline = new CommandDeadline(uncancelled, 1000, clock);

    deadline.clear();
    deadline.restart();
    clock.tick(10_000);

    assert.equal(deadline.signal.aborted, false);
  });

  it("aborts with the caller's reason when the caller's signal aborts", () => {
    const clock = new ManualClock();
    const caller = new AbortController();
    const deadline = new CommandDeadline(caller.signal, 1000, clock);
    const reason = new Error("cancelled by its caller");

    caller.abort(reason);
    deadline.clear();

    assert.equal(deadline.signal.reason, reason);
  });
});
