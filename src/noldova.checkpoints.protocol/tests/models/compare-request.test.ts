/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CompareRequest, FolderReference, InvalidCheckpointIdException } from "@noldova/checkpoints.protocol";
import { JsonException } from "@noldova/context.json";

describe("CompareRequest", { concurrency: true }, () => {
  const folder = new FolderReference("project-1", "/work/project");
  const folderJson = { identity: "project-1", path: "/work/project" };
  const first = "019a0b6c-7d1e-7f00-8abc-0123456789ab";
  const second = "019a0b6c-7d1f-7f00-8abc-0123456789ab";

  it("writes and reads a comparison of two checkpoints, and one with the folder now", () => {
    assert.deepEqual(new CompareRequest(folder, first, second).toJson(), { folder: folderJson, from: first, to: second });
    assert.deepEqual(CompareRequest.fromJson({ folder: folderJson, from: first, to: null }), new CompareRequest(folder, first, null));
    assert.equal(CompareRequest.method, "checkpoints.compare");
  });

  it("refuses an id that isn't a UUID of version 7, on either side", () => {
    assert.throws(() => new CompareRequest(folder, "a", null), new InvalidCheckpointIdException("a"));
    assert.throws(() => new CompareRequest(folder, first, first.toUpperCase()), new InvalidCheckpointIdException(first.toUpperCase()));
  });

  it("refuses JSON with another field", () => {
    assert.throws(() => CompareRequest.fromJson({ folder: folderJson, from: first, to: null, renames: true }), new JsonException("The field is not part of this message, which accepts no unknown fields.", "CompareRequest.renames"));
  });

  it("refuses JSON missing any of its fields", () => {
    const json = { folder: { identity: "project-1", path: "/work/project" }, from: "019a0b6c-7d1e-7f00-8abc-0123456789ab", to: null };

    for (const field of Object.keys(json))
      assert.throws(() => CompareRequest.fromJson(Object.fromEntries(Object.entries(json).filter(([key]) => key !== field))), new JsonException("The field is required.", `CompareRequest.${field}`));
  });
});
