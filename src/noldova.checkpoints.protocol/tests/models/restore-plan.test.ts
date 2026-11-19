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
  ChangeSide, EarlierPathsMismatchException, InvalidCheckpointIdException, InvalidPlanStateException, InvalidRelativePathException, InvalidSizeException, KeepReason, KeptPath, PathKind,
  RestoreAction, RestorePlan, RestoreStep
} from "@noldova/checkpoints.protocol";
import { JsonException } from "@noldova/context.json";

describe("RestorePlan", { concurrency: true }, () => {
  const id = "019a0b6c-7d1e-7f00-8abc-0123456789ab";
  const state = "a".repeat(64);
  const plan = new RestorePlan(id, [new RestoreStep("a.txt", RestoreAction.Delete, new ChangeSide(PathKind.File, 1, true), null)],
    [new KeptPath(".git", KeepReason.Repository)], 0, 1024, state, null);
  const planJson = {
    checkpoint: id,
    steps: [{ path: "a.txt", action: "Delete", before: { kind: "File", size: 1, isText: true }, after: null }],
    stays: [{ path: ".git", reason: "Repository" }],
    bytesToWrite: 0,
    spaceNeeded: 1024,
    state,
    paths: null,
    earlierPaths: []
  };

  it("writes and reads its checkpoint, steps, kept paths, sizes and state", () => {
    assert.deepEqual(plan.toJson(), planJson);
    assert.deepEqual(RestorePlan.fromJson(planJson), plan);
  });

  it("writes and reads the paths its preview was limited to, and null paths as the whole folder", () => {
    const limited = new RestorePlan(id, [], [], 0, 0, state, ["src"]);
    const limitedJson = { checkpoint: id, steps: [], stays: [], bytesToWrite: 0, spaceNeeded: 0, state, paths: ["src"], earlierPaths: [] };

    assert.deepEqual(limited.toJson(), limitedJson);
    assert.deepEqual(RestorePlan.fromJson(limitedJson), limited);
    assert.equal(RestorePlan.fromJson({ ...limitedJson, paths: null }).paths, null);
    assert.equal(plan.paths, null);
  });

  it("writes and reads the paths it writes as the earlier checkpoint had them, none by default", () => {
    const steps = [new RestoreStep("a.txt", RestoreAction.Delete, new ChangeSide(PathKind.File, 1, true), null),
      new RestoreStep("b.txt", RestoreAction.Write, null, new ChangeSide(PathKind.File, 2, true))];
    const earlier = new RestorePlan(id, steps, [], 2, 3, state, null, ["b.txt"]);
    const given = ["a.txt"];
    const copied = new RestorePlan(id, steps, [], 2, 3, state, null, given);
    given.length = 0;

    assert.deepEqual(earlier.toJson().earlierPaths, ["b.txt"]);
    assert.deepEqual(RestorePlan.fromJson(earlier.toJson()), earlier);
    assert.deepEqual([plan.earlierPaths, copied.earlierPaths], [[], ["a.txt"]]);
  });

  it("refuses an earlier path that no step writes, or that it names twice", () => {
    assert.throws(() => new RestorePlan(id, plan.steps, [], 0, 1024, state, null, ["b.txt"]), new EarlierPathsMismatchException("b.txt"));
    assert.throws(() => new RestorePlan(id, plan.steps, [], 0, 1024, state, null, ["a.txt", "a.txt"]), new EarlierPathsMismatchException("a.txt"));
    assert.throws(() => RestorePlan.fromJson({ ...planJson, earlierPaths: [".git"] }), new EarlierPathsMismatchException(".git"));
  });

  it("refuses a path with an empty name, \".\" or \"..\", or one holding \"\\\"", () => {
    for (const path of ["a/../b", "", "a//b", "./a", "a\\b", "\\a"])
      assert.throws(() => new RestorePlan(id, [], [], 0, 0, state, [path]), new InvalidRelativePathException(path));
    assert.throws(() => RestorePlan.fromJson({ ...planJson, paths: ["src\\a.txt"] }), new InvalidRelativePathException("src\\a.txt"));
  });

  it("refuses JSON missing any of its fields, the paths included", () => {
    for (const field of Object.keys(planJson))
      assert.throws(() => RestorePlan.fromJson(Object.fromEntries(Object.entries(planJson).filter(([key]) => key !== field))), new JsonException("The field is required.", `RestorePlan.${field}`));
  });

  it("keeps its own copy of the steps and kept paths it was given", () => {
    const steps = [new RestoreStep("a", RestoreAction.Delete, new ChangeSide(PathKind.Folder, null, false), null)];
    const stays = [new KeptPath("b", KeepReason.Unread)];
    const copied = new RestorePlan(id, steps, stays, 0, 0, state, null);
    steps.length = 0;
    stays.length = 0;

    assert.deepEqual([copied.steps.length, copied.stays.length], [1, 1]);
  });

  it("refuses a checkpoint id that isn't a UUID version 7", () => {
    assert.throws(() => new RestorePlan("checkpoint-1", [], [], 0, 0, state, null),
      new InvalidCheckpointIdException("checkpoint-1"));
  });

  it("refuses a size that isn't a whole number of bytes, 0 or more", () => {
    for (const [bytesToWrite, spaceNeeded, size] of [[-1, 0, -1], [0, 1.5, 1.5], [Number.MAX_SAFE_INTEGER + 1, 0, Number.MAX_SAFE_INTEGER + 1]] as const)
      assert.throws(() => new RestorePlan(id, [], [], bytesToWrite, spaceNeeded, state, null), new InvalidSizeException(size));
  });

  it("refuses a state that isn't a lowercase SHA-256 in hexadecimal", () => {
    for (const bad of ["", "a".repeat(63), "A".repeat(64), "g".repeat(64)])
      assert.throws(() => new RestorePlan(id, [], [], 0, 0, bad, null), new InvalidPlanStateException(bad));
  });

  it("refuses JSON with another field", () => {
    assert.throws(() => RestorePlan.fromJson({ ...planJson, folder: "x" }), new JsonException("The field is not part of this message, which accepts no unknown fields.", "RestorePlan.folder"));
  });
});
