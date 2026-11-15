/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DeleteFolderRequest, FolderReference } from "@noldova/checkpoints.protocol";
import { JsonException } from "@noldova/context.json";

describe("DeleteFolderRequest", { concurrency: true }, () => {
  it("is the checkpoints.deleteFolder method", () => {
    assert.equal(DeleteFolderRequest.method, "checkpoints.deleteFolder");
  });

  it("writes and reads its folder", () => {
    const request = new DeleteFolderRequest(new FolderReference("project", "/work/project"));

    assert.deepEqual(request.toJson(), { folder: { identity: "project", path: "/work/project" } });
    assert.deepEqual(DeleteFolderRequest.fromJson({ folder: { identity: "project", path: "/work/project" } }), request);
  });

  it("refuses JSON with another field or without its folder", () => {
    assert.throws(() => DeleteFolderRequest.fromJson({ folder: { identity: "project", path: "/" }, checkpoint: "x" }), new JsonException("The field is not part of this message, which accepts no unknown fields.", "DeleteFolderRequest.checkpoint"));
    assert.throws(() => DeleteFolderRequest.fromJson({}), new JsonException("The field is required.", "DeleteFolderRequest.folder"));
  });

  it("refuses JSON missing any of its fields", () => {
    const json = { folder: { identity: "project", path: "/work/project" } };

    for (const field of Object.keys(json))
      assert.throws(() => DeleteFolderRequest.fromJson(Object.fromEntries(Object.entries(json).filter(([key]) => key !== field))), new JsonException("The field is required.", `DeleteFolderRequest.${field}`));
  });
});
