/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DiffTarget, InvalidCheckpointIdException, MissingFieldException, UnknownFieldException } from "@noldova/checkpoints.protocol";

describe("DiffTarget", { concurrency: true }, () => {
  it("writes and reads another checkpoint, and the folder now as no checkpoint", () => {
    const id = "019a0b6c-7d1e-7f00-8abc-0123456789ab";

    assert.deepEqual(new DiffTarget(id).toJson(), { checkpoint: id });
    assert.deepEqual(DiffTarget.fromJson({ checkpoint: null }), new DiffTarget(null));
  });

  it("refuses an id that isn't a UUID of version 7, and JSON with another field", () => {
    assert.throws(() => new DiffTarget("latest"), new InvalidCheckpointIdException("latest"));
    assert.throws(() => DiffTarget.fromJson({ checkpoint: null, folder: true }), new UnknownFieldException("DiffTarget", "folder"));
  });

  it("refuses JSON missing any of its fields", () => {
    const json = { checkpoint: null };

    for (const field of Object.keys(json))
      assert.throws(() => DiffTarget.fromJson(Object.fromEntries(Object.entries(json).filter(([key]) => key !== field))), new MissingFieldException("DiffTarget", field));
  });
});
