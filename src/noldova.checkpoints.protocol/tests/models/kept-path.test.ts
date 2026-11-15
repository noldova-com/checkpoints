/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InvalidRelativePathException, KeepReason, KeptPath, UnknownKeepReasonException } from "@noldova/checkpoints.protocol";
import { JsonException } from "@noldova/context.json";

describe("KeptPath", { concurrency: true }, () => {
  it("writes and reads its path and reason", () => {
    const kept = new KeptPath("vendor/lib/.git", KeepReason.Repository);

    assert.deepEqual(kept.toJson(), { path: "vendor/lib/.git", reason: "Repository" });
    assert.deepEqual(KeptPath.fromJson({ path: "vendor/lib/.git", reason: "Repository" }), kept);
  });

  it("refuses a path with an empty name, or one that leaves the folder", () => {
    for (const path of ["", "/a", "a/", "a//b", "./a", "a/../b", ".."])
      assert.throws(() => new KeptPath(path, KeepReason.Ignored), new InvalidRelativePathException(path));
  });

  it("refuses JSON with an unknown reason or another field", () => {
    assert.throws(() => KeptPath.fromJson({ path: "a", reason: "Locked" }), new UnknownKeepReasonException("Locked"));
    assert.throws(() => KeptPath.fromJson({ path: "a", reason: "Unread", size: 1 }), new JsonException("The field is not part of this message, which accepts no unknown fields.", "KeptPath.size"));
  });

  it("refuses JSON missing any of its fields", () => {
    const json = { path: "vendor/lib/.git", reason: "Repository" };

    for (const field of Object.keys(json))
      assert.throws(() => KeptPath.fromJson(Object.fromEntries(Object.entries(json).filter(([key]) => key !== field))), new JsonException("The field is required.", `KeptPath.${field}`));
  });
});
