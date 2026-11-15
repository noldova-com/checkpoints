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
  ChangeSide, InvalidRelativePathException, PathKind, RestoreAction, RestoreStep, StepSidesMismatchException, UnknownRestoreActionException
} from "@noldova/checkpoints.protocol";
import { JsonException } from "@noldova/context.json";

describe("RestoreStep", { concurrency: true }, () => {
  const now = new ChangeSide(PathKind.File, 4, true);
  const kept = new ChangeSide(PathKind.Link, 7, false);
  const nowJson = { kind: "File", size: 4, isText: true };
  const keptJson = { kind: "Link", size: 7, isText: false };

  it("writes and reads a write, a replacement and a deletion with their sides", () => {
    const steps = [
      [new RestoreStep("new.txt", RestoreAction.Write, null, kept), { path: "new.txt", action: "Write", before: null, after: keptJson }],
      [new RestoreStep("src/über.ts", RestoreAction.Replace, now, kept), { path: "src/über.ts", action: "Replace", before: nowJson, after: keptJson }],
      [new RestoreStep("old", RestoreAction.Delete, now, null), { path: "old", action: "Delete", before: nowJson, after: null }]
    ] as const;
    for (const [step, json] of steps) {
      assert.deepEqual(step.toJson(), json);
      assert.deepEqual(RestoreStep.fromJson(json), step);
    }
  });

  it("has a side now exactly when it isn't a write, and one in the checkpoint exactly when it isn't a deletion", () => {
    const wrong = [
      [RestoreAction.Write, now, kept], [RestoreAction.Write, null, null], [RestoreAction.Replace, null, kept],
      [RestoreAction.Replace, now, null], [RestoreAction.Delete, null, null], [RestoreAction.Delete, now, kept]
    ] as const;
    for (const [action, before, after] of wrong)
      assert.throws(() => new RestoreStep("a", action, before, after), new StepSidesMismatchException(action));
  });

  it("refuses a path with an empty name, or one that leaves the folder", () => {
    for (const path of ["", "/a", "a/", "a//b", "./a", "a/../b", ".."])
      assert.throws(() => new RestoreStep(path, RestoreAction.Delete, now, null), new InvalidRelativePathException(path));
  });

  it("refuses JSON with an unknown action or another field", () => {
    assert.throws(() => RestoreStep.fromJson({ path: "a", action: "Move", before: nowJson, after: null }), new UnknownRestoreActionException("Move"));
    assert.throws(() => RestoreStep.fromJson({ path: "a", action: "Delete", before: nowJson, after: null, size: 1 }), new JsonException("The field is not part of this message, which accepts no unknown fields.", "RestoreStep.size"));
  });

  it("refuses JSON missing any of its fields", () => {
    const json = { path: "a", action: "Delete", before: { kind: "File", size: 4, isText: true }, after: null };

    for (const field of Object.keys(json))
      assert.throws(() => RestoreStep.fromJson(Object.fromEntries(Object.entries(json).filter(([key]) => key !== field))), new JsonException("The field is required.", `RestoreStep.${field}`));
  });
});
