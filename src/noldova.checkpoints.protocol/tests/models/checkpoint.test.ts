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
  CaptureMode, Checkpoint, InvalidCheckpointIdException, InvalidDateException, InvalidTimeException, LabelTooLongException, MissingFieldException, UnknownFieldException,
  UnreadPath, UnreadReason
} from "@noldova/checkpoints.protocol";

describe("Checkpoint", { concurrency: true }, () => {
  const id = "019a0b6c-7d1e-7f00-8abc-0123456789ab";
  const json = {
    id,
    time: "2026-10-18T12:00:00.000Z",
    mode: "EveryFile",
    label: "Turn 3",
    unreadPaths: [{ path: "locked.db", reason: "Denied", code: null }]
  };

  it("writes and reads its id, time, mode, label and unread paths", () => {
    const checkpoint = new Checkpoint(id, new Date("2026-10-18T12:00:00.000Z"), CaptureMode.EveryFile, "Turn 3", [new UnreadPath("locked.db", UnreadReason.Denied, null)]);

    assert.deepEqual(checkpoint.toJson(), json);
    assert.deepEqual(Checkpoint.fromJson(json), checkpoint);
  });

  it("keeps its own copy of the time and the paths it was given", () => {
    const time = new Date("2026-10-18T12:00:00.000Z");
    const paths = [new UnreadPath("a", UnreadReason.Changing, null)];
    const checkpoint = new Checkpoint(id, time, CaptureMode.IgnoreFiles, null, paths);
    time.setTime(0);
    paths.length = 0;

    assert.deepEqual([checkpoint.time.toISOString(), checkpoint.unreadPaths.length, checkpoint.label], ["2026-10-18T12:00:00.000Z", 1, null]);
  });

  it("takes a label of up to 1,024 characters and refuses a longer one", () => {
    assert.equal(new Checkpoint(id, new Date(0), CaptureMode.EveryFile, "x".repeat(1_024), []).label?.length, 1_024);
    assert.throws(() => new Checkpoint(id, new Date(0), CaptureMode.EveryFile, "x".repeat(1_025), []),
      new LabelTooLongException(1_025));
  });

  it("refuses a time that isn't a valid date, which it couldn't write", () => {
    assert.throws(() => new Checkpoint(id, new Date(Number.NaN), CaptureMode.EveryFile, null, []), new InvalidDateException());
  });

  it("refuses an id that isn't a lowercase UUID version 7", () => {
    for (const other of ["019a0b6c-7d1e-4f00-8abc-0123456789ab", "019A0B6C-7D1E-7F00-8ABC-0123456789AB", "019a0b6c-7d1e-7f00-cabc-0123456789ab", ""])
      assert.throws(() => new Checkpoint(other, new Date(0), CaptureMode.EveryFile, null, []), new InvalidCheckpointIdException(other));
  });

  it("refuses a time that isn't UTC with milliseconds, or isn't a real day", () => {
    for (const time of ["2026-10-18T12:00:00Z", "2026-10-18T12:00:00.000+02:00", "2026-13-01T00:00:00.000Z", "2026-02-30T00:00:00.000Z"])
      assert.throws(() => Checkpoint.fromJson({ ...json, time }), new InvalidTimeException(time));
  });

  it("refuses JSON with another field", () => {
    assert.throws(() => Checkpoint.fromJson({ ...json, size: 1 }), new UnknownFieldException("Checkpoint", "size"));
  });

  it("refuses JSON missing any of its fields", () => {
    for (const field of Object.keys(json))
      assert.throws(() => Checkpoint.fromJson(Object.fromEntries(Object.entries(json).filter(([key]) => key !== field))), new MissingFieldException("Checkpoint", field));
  });
});
