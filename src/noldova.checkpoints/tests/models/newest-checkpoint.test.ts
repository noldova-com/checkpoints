/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { NewestCheckpoint } from "../../src/models/newest-checkpoint.ts";

describe("NewestCheckpoint", { concurrency: true }, () => {
  it("holds the newest checkpoint's reference and its commit", () => {
    const newest = new NewestCheckpoint("refs/checkpoints/01890a5d-ac96-774b-bcce-b302099a8057", "0123456789abcdef0123456789abcdef01234567");

    assert.deepEqual([newest.reference, newest.commit], ["refs/checkpoints/01890a5d-ac96-774b-bcce-b302099a8057", "0123456789abcdef0123456789abcdef01234567"]);
  });
});
