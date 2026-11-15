/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { StoreReads } from "../../src/services/store-reads.ts";

describe("StoreReads", { concurrency: true }, () => {
  it("runs reads of one store side by side, and a move of it once each read that started has ended, failed or not", async () => {
    const reads = new StoreReads();
    const order: string[] = [];
    const first = Promise.withResolvers<void>();
    const second = Promise.withResolvers<void>();
    const reading = [
      reads.readAsync("a", async () => {
        order.push("first started");
        await first.promise;
        order.push("first ended");
        return 1;
      }),
      reads.readAsync("a", async () => {
        order.push("second started");
        await second.promise;
        throw new Error("the second read failed");
      })
    ];

    const moving = reads.moveAsync("a", async () => {
      order.push("moved");
      return "moved";
    });
    first.resolve();
    await reading[0];
    order.push("first given");
    second.resolve();

    const [read, failed] = await Promise.allSettled(reading);
    assert.ok(failed?.status === "rejected" && failed.reason instanceof Error);
    assert.deepEqual([read, failed.reason.message, await moving], [{ status: "fulfilled", value: 1 }, "the second read failed", "moved"]);
    assert.deepEqual(order, ["first started", "second started", "first ended", "first given", "moved"]);
  });

  it("gives null for a read of a store being moved, without running it, and runs the reads of other stores then", async () => {
    const reads = new StoreReads();
    const { promise: held, resolve: release } = Promise.withResolvers<void>();
    const ran: string[] = [];

    const moving = reads.moveAsync("a", () => held);
    const skipped = await reads.readAsync("a", async () => ran.push("a"));
    const other = await reads.readAsync("b", async () => ran.push("b"));
    release();
    await moving;

    assert.deepEqual([skipped, other, ran], [null, 1, ["b"]]);
  });

  it("gives the move's failure, and runs the reads of the store again once the move has ended", async () => {
    const reads = new StoreReads();

    await assert.rejects(reads.moveAsync("a", async () => { throw new Error("the move failed"); }), /the move failed/);
    await reads.moveAsync("a", async () => undefined);

    assert.equal(await reads.readAsync("a", async () => "read"), "read");
  });
});
