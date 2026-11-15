/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it, type TestContext } from "node:test";
import { setImmediate } from "node:timers/promises";

import { RestoreStepFailedException } from "../../src/exceptions/restore-step-failed.exception.ts";
import { RestorePaths } from "../../src/services/restore-paths.ts";
import { FailureFixture } from "../fixtures/failure.fixture.ts";

describe("RestorePaths' retries", () => {
  const busy = (): FailureFixture => new FailureFixture("busy", "EBUSY");

  const heldAsync = async (t: TestContext, relativePath: string, refusals: number, early: number[]): Promise<string> => {
    let attempts = 0;
    let tried = Promise.withResolvers<void>();
    const running = RestorePaths.retryAsync(relativePath, async () => {
      attempts++;
      tried.resolve();
      if (attempts <= refusals)
        throw busy();
      return "done";
    });
    for (let attempt = 1; attempt <= Math.min(refusals, 2); attempt++) {
      await tried.promise;
      tried = Promise.withResolvers<void>();
      await setImmediate();
      t.mock.timers.tick(100 * attempt - 1);
      await setImmediate();
      early.push(attempts);
      t.mock.timers.tick(1);
    }
    return await running;
  };

  it("runs a change again while the path is held, once each delay has passed and not before, and gives up with the path after the last attempt", async t => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const freed: number[] = [];
    const held: number[] = [];

    assert.equal(await heldAsync(t, "a.txt", 2, freed), "done");

    await assert.rejects(heldAsync(t, "b.txt", Number.POSITIVE_INFINITY, held), (error: unknown) =>
      error instanceof RestoreStepFailedException && error.path === "b.txt" && error.cause instanceof Error);
    assert.deepEqual([freed, held], [[1, 2], [1, 2]]);
  });
});
