/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FolderReference, ListRequest, MissingFieldException, UnknownFieldException } from "@noldova/checkpoints.protocol";

describe("ListRequest", { concurrency: true }, () => {
  it("is the checkpoints.list method", () => {
    assert.equal(ListRequest.method, "checkpoints.list");
  });

  it("writes and reads its folder", () => {
    const request = new ListRequest(new FolderReference("project", "/work/project"));

    assert.deepEqual(request.toJson(), { folder: { identity: "project", path: "/work/project" } });
    assert.deepEqual(ListRequest.fromJson({ folder: { identity: "project", path: "/work/project" } }), request);
  });

  it("refuses JSON with another field", () => {
    assert.throws(() => ListRequest.fromJson({ folder: { identity: "project", path: "/" }, limit: 5 }), new UnknownFieldException("ListRequest", "limit"));
  });

  it("refuses JSON missing any of its fields", () => {
    const json = { folder: { identity: "project", path: "/work/project" } };

    for (const field of Object.keys(json))
      assert.throws(() => ListRequest.fromJson(Object.fromEntries(Object.entries(json).filter(([key]) => key !== field))), new MissingFieldException("ListRequest", field));
  });
});
