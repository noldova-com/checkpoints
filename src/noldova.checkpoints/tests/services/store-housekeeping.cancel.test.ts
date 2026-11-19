/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { describe, it } from "node:test";

import { StoreHousekeeping } from "../../src/services/store-housekeeping.ts";
import { CancelFixture } from "../fixtures/cancel.fixture.ts";
import { HousekeepingStore } from "../fixtures/housekeeping-store.fixture.ts";

describe("StoreHousekeeping's cancel", () => {
  const plentyAsync = async (): Promise<number> => Number.MAX_SAFE_INTEGER;

  it("stops a pass whose signal aborts during its repack, keeping every checkpoint and writing no record", async t => {
    const fixture = await HousekeepingStore.startAsync(t);
    await fixture.leaveAsync("old packed", true);
    const cancel = new CancelFixture(t);
    fixture.harness.context.watchStart = command => {
      if (command === "repack")
        cancel.cancel();
    };

    await assert.rejects(new StoreHousekeeping(fixture.git, plentyAsync, fixture.harness.clock).runAsync(fixture.store, cancel.signal), cancel.reason);

    assert.equal(existsSync(fixture.store.housekeepingFile), false);
    assert.deepEqual(fixture.harness.context.running, []);
    fixture.harness.context.watchStart = () => undefined;
    await fixture.checkWholeAsync();
  });
});
