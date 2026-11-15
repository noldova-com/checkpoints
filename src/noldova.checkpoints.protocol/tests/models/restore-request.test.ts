/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FolderReference, InvalidPlanStateException, RestorePlan, RestoreRequest } from "@noldova/checkpoints.protocol";
import { JsonException } from "@noldova/context.json";

describe("RestoreRequest", { concurrency: true }, () => {
  const folder = new FolderReference("project-1", "/work/project");
  const folderJson = { identity: "project-1", path: "/work/project" };
  const planJson = { checkpoint: "019a0b6c-7d1e-7f00-8abc-0123456789ab", steps: [], stays: [], bytesToWrite: 0, spaceNeeded: 0, state: "a".repeat(64), paths: null };

  it("writes and reads its folder and plan", () => {
    const request = new RestoreRequest(folder, RestorePlan.fromJson(planJson));

    assert.deepEqual(request.toJson(), { folder: folderJson, plan: planJson });
    assert.deepEqual(RestoreRequest.fromJson({ folder: folderJson, plan: planJson }), request);
  });

  it("refuses JSON with another field, or a plan that isn't one", () => {
    assert.throws(() => RestoreRequest.fromJson({ folder: folderJson, plan: planJson, checkpoint: planJson.checkpoint }), new JsonException("The field is not part of this message, which accepts no unknown fields.", "RestoreRequest.checkpoint"));
    assert.throws(() => RestoreRequest.fromJson({ folder: folderJson, plan: { ...planJson, state: "x" } }), new InvalidPlanStateException("x"));
  });

  it("refuses JSON missing any of its fields", () => {
    const json = { folder: folderJson, plan: planJson };

    for (const field of Object.keys(json))
      assert.throws(() => RestoreRequest.fromJson(Object.fromEntries(Object.entries(json).filter(([key]) => key !== field))), new JsonException("The field is required.", `RestoreRequest.${field}`));
  });
});
