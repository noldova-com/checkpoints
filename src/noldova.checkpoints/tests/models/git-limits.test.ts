/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GitLimits } from "../../src/models/git-limits.ts";

describe("GitLimits", { concurrency: true }, () => {
  it("keeps the limit of a command, the quiet a batch may keep, the idle time before a store's Git stops, and the time a stop waits", () => {
    const limits = new GitLimits(1000, 2000, 3000, 4000);

    assert.deepEqual([limits.commandMilliseconds, limits.batchIdleMilliseconds, limits.idleStopMilliseconds, limits.stopMilliseconds], [1000, 2000, 3000, 4000]);
  });
});
