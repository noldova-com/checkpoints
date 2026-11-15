/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CaptureResumedEvent, InvalidIdentityException } from "@noldova/checkpoints.protocol";
import { JsonException } from "@noldova/context.json";

describe("CaptureResumedEvent", { concurrency: true }, () => {
  it("writes and reads the folder's identity", () => {
    const event = new CaptureResumedEvent("project-1");

    assert.equal(CaptureResumedEvent.event, "checkpoints.captureResumed");
    assert.deepEqual(event.toJson(), { identity: "project-1" });
    assert.deepEqual(CaptureResumedEvent.fromJson({ identity: "project-1" }), event);
  });

  it("refuses an identity it can't take, and JSON with another field", () => {
    assert.throws(() => new CaptureResumedEvent("project 1"), new InvalidIdentityException("project 1"));
    assert.throws(() => CaptureResumedEvent.fromJson({ identity: "project-1", reason: "" }), new JsonException("The field is not part of this message, which accepts no unknown fields.", "CaptureResumedEvent.reason"));
  });

  it("refuses JSON missing any of its fields", () => {
    const json = { identity: "project-1" };

    for (const field of Object.keys(json))
      assert.throws(() => CaptureResumedEvent.fromJson(Object.fromEntries(Object.entries(json).filter(([key]) => key !== field))), new JsonException("The field is required.", `CaptureResumedEvent.${field}`));
  });
});
