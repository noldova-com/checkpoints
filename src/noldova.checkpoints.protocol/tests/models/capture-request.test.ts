/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CaptureRequest, FolderReference, InvalidDateException, InvalidTimeException, LabelTooLongException } from "@noldova/checkpoints.protocol";
import { JsonException } from "@noldova/context.json";

describe("CaptureRequest", { concurrency: true }, () => {
  const folder = new FolderReference("project", "/work/project");

  it("is the checkpoints.capture method", () => {
    assert.equal(CaptureRequest.method, "checkpoints.capture");
  });

  it("writes and reads its folder and label, with no time it stands for by default", () => {
    const request = new CaptureRequest(folder, "Before the agent's turn");

    assert.deepEqual(request.toJson(), { folder: { identity: "project", path: "/work/project" }, label: "Before the agent's turn", asOf: null });
    assert.deepEqual(CaptureRequest.fromJson({ folder: { identity: "project", path: "/work/project" }, label: "Before the agent's turn", asOf: null }), request);
    assert.equal(CaptureRequest.fromJson({ folder: { identity: "project", path: "/work/project" }, label: null, asOf: null }).label, null);
    assert.equal(request.asOf, null);
  });

  it("writes and reads the time it stands for, as a copy", () => {
    const asOf = new Date("2026-11-19T03:30:00.250Z");
    const request = new CaptureRequest(folder, null, asOf);
    asOf.setTime(0);

    assert.deepEqual(request.toJson(), { folder: { identity: "project", path: "/work/project" }, label: null, asOf: "2026-11-19T03:30:00.250Z" });
    assert.deepEqual(CaptureRequest.fromJson(request.toJson()), request);
    assert.equal(request.asOf?.toISOString(), "2026-11-19T03:30:00.250Z");
  });

  it("refuses a time that is no date, as given or as written", () => {
    assert.throws(() => new CaptureRequest(folder, null, new Date(Number.NaN)), new InvalidDateException());
    assert.throws(() => CaptureRequest.fromJson({ folder: { identity: "project", path: "/" }, label: null, asOf: "2026-11-19" }), new InvalidTimeException("2026-11-19"));
  });

  it("refuses a label over 1,024 characters", () => {
    assert.throws(() => new CaptureRequest(folder, "x".repeat(1_025)), new LabelTooLongException(1_025));
  });

  it("refuses JSON with another field", () => {
    assert.throws(() => CaptureRequest.fromJson({ folder: { identity: "project", path: "/" }, label: null, asOf: null, mode: "EveryFile" }), new JsonException("The field is not part of this message, which accepts no unknown fields.", "CaptureRequest.mode"));
  });

  it("refuses JSON missing any of its fields", () => {
    const json = { folder: { identity: "project", path: "/work/project" }, label: null, asOf: null };

    for (const field of Object.keys(json))
      assert.throws(() => CaptureRequest.fromJson(Object.fromEntries(Object.entries(json).filter(([key]) => key !== field))), new JsonException("The field is required.", `CaptureRequest.${field}`));
  });
});
