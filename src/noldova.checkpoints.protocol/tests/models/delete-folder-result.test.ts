/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DeleteFolderOutcome, DeleteFolderResult, MissingFieldException, UnknownDeleteFolderOutcomeException, UnknownFieldException
} from "@noldova/checkpoints.protocol";

describe("DeleteFolderResult", { concurrency: true }, () => {
  it("writes and reads its outcome", () => {
    const result = new DeleteFolderResult(DeleteFolderOutcome.HeldUp);

    assert.deepEqual(result.toJson(), { outcome: "HeldUp" });
    assert.deepEqual(DeleteFolderResult.fromJson({ outcome: "HeldUp" }), result);
  });

  it("refuses JSON with another field or an unknown outcome", () => {
    assert.throws(() => DeleteFolderResult.fromJson({ outcome: "Deleted", bytes: 0 }), new UnknownFieldException("DeleteFolderResult", "bytes"));
    assert.throws(() => DeleteFolderResult.fromJson({ outcome: "Gone" }), new UnknownDeleteFolderOutcomeException("Gone"));
  });

  it("refuses JSON missing any of its fields", () => {
    const json = { outcome: "Deleted" };

    for (const field of Object.keys(json))
      assert.throws(() => DeleteFolderResult.fromJson(Object.fromEntries(Object.entries(json).filter(([key]) => key !== field))), new MissingFieldException("DeleteFolderResult", field));
  });
});
