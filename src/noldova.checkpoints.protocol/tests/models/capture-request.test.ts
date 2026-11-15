/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CaptureRequest, FolderReference, LabelTooLongException, MissingFieldException, UnknownFieldException } from "@noldova/checkpoints.protocol";

describe("CaptureRequest", { concurrency: true }, () => {
  const folder = new FolderReference("project", "/work/project");

  it("is the checkpoints.capture method", () => {
    assert.equal(CaptureRequest.method, "checkpoints.capture");
  });

  it("writes and reads its folder and label", () => {
    const request = new CaptureRequest(folder, "Before the agent's turn");

    assert.deepEqual(request.toJson(), { folder: { identity: "project", path: "/work/project" }, label: "Before the agent's turn" });
    assert.deepEqual(CaptureRequest.fromJson({ folder: { identity: "project", path: "/work/project" }, label: "Before the agent's turn" }), request);
    assert.equal(CaptureRequest.fromJson({ folder: { identity: "project", path: "/work/project" }, label: null }).label, null);
  });

  it("refuses a label over 1,024 characters", () => {
    assert.throws(() => new CaptureRequest(folder, "x".repeat(1_025)), new LabelTooLongException(1_025));
  });

  it("refuses JSON with another field", () => {
    assert.throws(() => CaptureRequest.fromJson({ folder: { identity: "project", path: "/" }, label: null, mode: "EveryFile" }), new UnknownFieldException("CaptureRequest", "mode"));
  });

  it("refuses JSON missing any of its fields", () => {
    const json = { folder: { identity: "project", path: "/work/project" }, label: null };

    for (const field of Object.keys(json))
      assert.throws(() => CaptureRequest.fromJson(Object.fromEntries(Object.entries(json).filter(([key]) => key !== field))), new MissingFieldException("CaptureRequest", field));
  });
});
