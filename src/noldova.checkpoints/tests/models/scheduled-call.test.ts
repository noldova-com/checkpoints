/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ScheduledCall } from "../../src/models/scheduled-call.ts";

describe("ScheduledCall", { concurrency: true }, () => {
  it("cancels its call through what it was given, once for each cancel", () => {
    let cancels = 0;
    const call = new ScheduledCall(() => {
      cancels += 1;
    });

    call.cancel();
    call.cancel();

    assert.equal(cancels, 2);
  });
});
