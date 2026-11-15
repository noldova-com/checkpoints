/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InvalidCheckpointIdException, InvalidIdentityException, RestoredEvent } from "@noldova/checkpoints.protocol";
import { JsonException } from "@noldova/context.json";

describe("RestoredEvent", { concurrency: true }, () => {
  const checkpoint = "019a0b6c-7d1e-7f00-8abc-0123456789ab";
  const before = "019a0b6c-7d1e-7f00-8abc-0123456789ac";

  it("writes and reads the folder's identity, the checkpoint restored and the one before", () => {
    const event = new RestoredEvent("project-1", checkpoint, before);

    assert.deepEqual(event.toJson(), { identity: "project-1", checkpoint, before });
    assert.deepEqual(RestoredEvent.fromJson({ identity: "project-1", checkpoint, before }), event);
  });

  it("refuses an identity or a checkpoint id it can't take", () => {
    assert.throws(() => new RestoredEvent("project 1", checkpoint, before), new InvalidIdentityException("project 1"));
    assert.throws(() => new RestoredEvent("project-1", "x", before), new InvalidCheckpointIdException("x"));
    assert.throws(() => new RestoredEvent("project-1", checkpoint, "x"), new InvalidCheckpointIdException("x"));
  });

  it("refuses JSON with another field", () => {
    assert.throws(() => RestoredEvent.fromJson({ identity: "project-1", checkpoint, before, plan: null }), new JsonException("The field is not part of this message, which accepts no unknown fields.", "RestoredEvent.plan"));
  });

  it("refuses JSON missing any of its fields", () => {
    const json = { identity: "project-1", checkpoint, before };

    for (const field of Object.keys(json))
      assert.throws(() => RestoredEvent.fromJson(Object.fromEntries(Object.entries(json).filter(([key]) => key !== field))), new JsonException("The field is required.", `RestoredEvent.${field}`));
  });
});
