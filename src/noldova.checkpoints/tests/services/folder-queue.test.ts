/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FolderQueue } from "../../src/services/folder-queue.ts";

describe("FolderQueue", { concurrency: true }, () => {
  const uncancelled: AbortSignal = new AbortController().signal;

  it("runs one folder's operations one at a time, in the order they arrive", async () => {
    const queue = new FolderQueue();
    const order: string[] = [];
    const { promise: held, resolve: release } = Promise.withResolvers<void>();

    const first = queue.runAsync("a", async () => {
      order.push("first started");
      await held;
      order.push("first ended");
      return 1;
    }, uncancelled);
    const second = queue.runAsync("a", async () => {
      order.push("second started");
      return 2;
    }, uncancelled);
    await Promise.resolve();
    release();

    assert.deepEqual(await Promise.all([first, second]), [1, 2]);
    assert.deepEqual(order, ["first started", "first ended", "second started"]);
  });

  it("runs operations on different folders side by side", async () => {
    const queue = new FolderQueue();
    const { promise: held, resolve: release } = Promise.withResolvers<void>();

    const first = queue.runAsync("a", async () => await held, uncancelled);
    const other = await queue.runAsync("b", async () => "b ran", uncancelled);
    release();
    await first;

    assert.equal(other, "b ran");
  });

  it("runs the next operation after one that failed, and gives the failure to its caller", async () => {
    const queue = new FolderQueue();

    const failed = queue.runAsync("a", async () => {
      throw new Error("broken");
    }, uncancelled);
    const next = queue.runAsync("a", async () => "ran", uncancelled);

    await assert.rejects(failed, /broken/);
    assert.equal(await next, "ran");
    assert.equal(await queue.runAsync("a", async () => "again", uncancelled), "again");
  });

  it("never runs an operation cancelled while it waits, gives the cancel to its caller, and runs the next one in its turn", async () => {
    const queue = new FolderQueue();
    const order: string[] = [];
    const { promise: held, resolve: release } = Promise.withResolvers<void>();
    const cancel = new AbortController();

    const first = queue.runAsync("a", async () => {
      await held;
      order.push("first");
    }, uncancelled);
    const cancelled = queue.runAsync("a", async () => {
      order.push("cancelled");
    }, cancel.signal);
    const next = queue.runAsync("a", async () => {
      order.push("next");
    }, uncancelled);
    cancel.abort(new Error("cancelled by its caller"));
    release();

    await assert.rejects(cancelled, /cancelled by its caller/);
    await Promise.all([first, next]);
    assert.deepEqual(order, ["first", "next"]);
    assert.equal(await queue.runAsync("a", async () => "again", uncancelled), "again");
  });
});
