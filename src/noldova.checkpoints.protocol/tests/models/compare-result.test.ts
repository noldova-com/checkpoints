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
  Change, ChangeSide, ChangeStatus, CompareChangesMismatchException, CompareOutcome, CompareResult, MissingFieldException, PathKind, UnknownFieldException
} from "@noldova/checkpoints.protocol";

describe("CompareResult", { concurrency: true }, () => {
  const change = new Change("a.txt", ChangeStatus.Added, null, new ChangeSide(PathKind.File, 1, true), null);

  it("writes and reads the changes a comparison found", () => {
    const result = new CompareResult(CompareOutcome.Compared, [change]);

    assert.deepEqual(result.toJson(), { outcome: "Compared", changes: [change.toJson()] });
    assert.deepEqual(CompareResult.fromJson(result.toJson()), result);
  });

  it("writes and reads an outcome that compared nothing, with no changes", () => {
    assert.deepEqual(CompareResult.fromJson({ outcome: "CheckpointMissing", changes: [] }), new CompareResult(CompareOutcome.CheckpointMissing, []));
  });

  it("refuses changes when the outcome didn't compare", () => {
    assert.throws(() => new CompareResult(CompareOutcome.FolderMissing, [change]),
      new CompareChangesMismatchException(CompareOutcome.FolderMissing));
  });

  it("refuses JSON with another field", () => {
    assert.throws(() => CompareResult.fromJson({ outcome: "Compared", changes: [], unread: [] }), new UnknownFieldException("CompareResult", "unread"));
  });

  it("refuses JSON missing any of its fields", () => {
    const json = { outcome: "CheckpointMissing", changes: [] };

    for (const field of Object.keys(json))
      assert.throws(() => CompareResult.fromJson(Object.fromEntries(Object.entries(json).filter(([key]) => key !== field))), new MissingFieldException("CompareResult", field));
  });
});
