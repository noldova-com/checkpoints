/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InvalidCheckpointIdException } from "@noldova/checkpoints.protocol";

import { CheckpointId } from "../../src/services/checkpoint-id.ts";

describe("CheckpointId", { concurrency: true }, () => {
  it("takes a lowercase UUID version 7", () => {
    for (const id of ["019a0b6c-7d1e-7f00-8abc-0123456789ab", "00000000-0000-7000-b000-000000000000"])
      assert.doesNotThrow(() => CheckpointId.check(id));
  });

  it("refuses any other text", () => {
    for (const id of ["", "019a0b6c-7d1e-4f00-8abc-0123456789ab", "019A0B6C-7D1E-7F00-8ABC-0123456789AB", "019a0b6c-7d1e-7f00-cabc-0123456789ab", "019a0b6c7d1e7f008abc0123456789ab"])
      assert.throws(() => CheckpointId.check(id), new InvalidCheckpointIdException(id));
  });
});
