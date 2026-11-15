/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PreviewOutcome, PreviewPlanMismatchException, PreviewResult, RestorePlan } from "@noldova/checkpoints.protocol";
import { JsonException } from "@noldova/context.json";

describe("PreviewResult", { concurrency: true }, () => {
  const planJson = { checkpoint: "019a0b6c-7d1e-7f00-8abc-0123456789ab", steps: [], stays: [], bytesToWrite: 0, spaceNeeded: 0, state: "a".repeat(64), paths: null };
  const plan = RestorePlan.fromJson(planJson);

  it("writes and reads a plan", () => {
    const result = new PreviewResult(PreviewOutcome.Planned, plan);

    assert.deepEqual(result.toJson(), { outcome: "Planned", plan: planJson });
    assert.deepEqual(PreviewResult.fromJson({ outcome: "Planned", plan: planJson }), result);
  });

  it("writes and reads an outcome without a plan", () => {
    for (const outcome of [PreviewOutcome.CheckpointMissing, PreviewOutcome.FolderMissing, PreviewOutcome.HeldUp]) {
      assert.deepEqual(new PreviewResult(outcome, null).toJson(), { outcome: outcome.value, plan: null });
      assert.deepEqual(PreviewResult.fromJson({ outcome: outcome.value, plan: null }), new PreviewResult(outcome, null));
    }
  });

  it("holds a plan exactly when its outcome is Planned", () => {
    assert.throws(() => new PreviewResult(PreviewOutcome.Planned, null),
      new PreviewPlanMismatchException(PreviewOutcome.Planned));
    assert.throws(() => new PreviewResult(PreviewOutcome.HeldUp, plan),
      new PreviewPlanMismatchException(PreviewOutcome.HeldUp));
  });

  it("refuses JSON with another field", () => {
    assert.throws(() => PreviewResult.fromJson({ outcome: "HeldUp", plan: null, paths: [] }), new JsonException("The field is not part of this message, which accepts no unknown fields.", "PreviewResult.paths"));
  });

  it("refuses JSON missing any of its fields", () => {
    const json = { outcome: "HeldUp", plan: null };

    for (const field of Object.keys(json))
      assert.throws(() => PreviewResult.fromJson(Object.fromEntries(Object.entries(json).filter(([key]) => key !== field))), new JsonException("The field is required.", `PreviewResult.${field}`));
  });
});
