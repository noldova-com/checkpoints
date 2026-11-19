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
  CaptureMode, Checkpoint, InvalidSizeException, RestoreCheckpointsMismatchException, RestoreContentMismatchException, RestoreOutcome, RestoreResult
} from "@noldova/checkpoints.protocol";
import { JsonException } from "@noldova/context.json";

describe("RestoreResult", { concurrency: true }, () => {
  const before = new Checkpoint("019a0b6c-7d1e-7f00-8abc-0123456789ab", new Date("2026-10-18T12:00:00.000Z"), CaptureMode.EveryFile, "Before", []);
  const recovered = new Checkpoint("019a0b6c-7d1e-7f00-8abc-0123456789ac", new Date("2026-10-18T12:00:01.000Z"), CaptureMode.EveryFile, "Recovered", []);
  const beforeJson = { id: before.id, time: "2026-10-18T12:00:00.000Z", mode: "EveryFile", label: "Before", unreadPaths: [] };
  const recoveredJson = { id: recovered.id, time: "2026-10-18T12:00:01.000Z", mode: "EveryFile", label: "Recovered", unreadPaths: [] };

  it("writes and reads a restore with the checkpoint before it and one that recovered a write", () => {
    const result = new RestoreResult(RestoreOutcome.Restored, before, recovered);

    assert.deepEqual(result.toJson(), { outcome: "Restored", before: beforeJson, recovered: recoveredJson, contentSize: null, contentLimit: null });
    assert.deepEqual(RestoreResult.fromJson({ outcome: "Restored", before: beforeJson, recovered: recoveredJson, contentSize: null, contentLimit: null }), result);
  });

  it("writes and reads a rollback with the checkpoint before it, and a refusal with neither", () => {
    assert.deepEqual(RestoreResult.fromJson({ outcome: "RolledBack", before: beforeJson, recovered: null, contentSize: null, contentLimit: null }),
      new RestoreResult(RestoreOutcome.RolledBack, before, null));
    for (const outcome of [RestoreOutcome.MovedOn, RestoreOutcome.CheckpointMissing, RestoreOutcome.FolderMissing, RestoreOutcome.LowDiskSpace, RestoreOutcome.HeldUp]) {
      assert.deepEqual(new RestoreResult(outcome, null, null).toJson(), { outcome: outcome.value, before: null, recovered: null, contentSize: null, contentLimit: null });
      assert.deepEqual(RestoreResult.fromJson({ outcome: outcome.value, before: null, recovered: null, contentSize: null, contentLimit: null }),
        new RestoreResult(outcome, null, null));
    }
  });

  it("writes and reads a restore refused as too large with the size of the checkpoint before it and its limit", () => {
    const json = { outcome: "TooLarge", before: null, recovered: null, contentSize: 1_200_000_000, contentLimit: 1_073_741_824 };
    const result = new RestoreResult(RestoreOutcome.TooLarge, null, null, 1_200_000_000, 1_073_741_824);

    assert.deepEqual(result.toJson(), json);
    assert.deepEqual(RestoreResult.fromJson(json), result);
    assert.deepEqual([result.contentSize, result.contentLimit], [1_200_000_000, 1_073_741_824]);
  });

  it("holds the content size and its limit exactly when it is too large, each a whole number of bytes", () => {
    const wrong = [[RestoreOutcome.TooLarge, null, 1], [RestoreOutcome.TooLarge, 1, null], [RestoreOutcome.MovedOn, 1, 1], [RestoreOutcome.MovedOn, null, 1]] as const;
    for (const [outcome, size, limit] of wrong)
      assert.throws(() => new RestoreResult(outcome, null, null, size, limit), new RestoreContentMismatchException(outcome));
    assert.throws(() => new RestoreResult(RestoreOutcome.TooLarge, null, null, 1.5, 1), new InvalidSizeException(1.5));
    assert.throws(() => new RestoreResult(RestoreOutcome.TooLarge, null, null, 1, -1), new InvalidSizeException(-1));
  });

  it("holds the checkpoint before exactly when it restored or rolled back, and a recovered one only when it restored", () => {
    const wrong = [
      [RestoreOutcome.Restored, null, null], [RestoreOutcome.RolledBack, null, null], [RestoreOutcome.MovedOn, before, null],
      [RestoreOutcome.RolledBack, before, recovered]
    ] as const;
    for (const [outcome, first, second] of wrong)
      assert.throws(() => new RestoreResult(outcome, first, second), new RestoreCheckpointsMismatchException(outcome));
  });

  it("refuses JSON with another field", () => {
    assert.throws(() => RestoreResult.fromJson({ outcome: "MovedOn", before: null, recovered: null, contentSize: null, contentLimit: null, plan: null }), new JsonException("The field is not part of this message, which accepts no unknown fields.", "RestoreResult.plan"));
  });

  it("refuses JSON missing any of its fields", () => {
    const json = { outcome: "MovedOn", before: null, recovered: null, contentSize: null, contentLimit: null };

    for (const field of Object.keys(json))
      assert.throws(() => RestoreResult.fromJson(Object.fromEntries(Object.entries(json).filter(([key]) => key !== field))), new JsonException("The field is required.", `RestoreResult.${field}`));
  });
});
