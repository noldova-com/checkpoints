/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CapturePausedEvent, InvalidIdentityException, InvalidSizeException } from "@noldova/checkpoints.protocol";
import { JsonException } from "@noldova/context.json";

describe("CapturePausedEvent", { concurrency: true }, () => {
  it("writes and reads the folder's identity, the space free and the space needed", () => {
    const event = new CapturePausedEvent("project-1", 1_000, 2_147_483_648);

    assert.equal(CapturePausedEvent.event, "checkpoints.capturePaused");
    assert.deepEqual(event.toJson(), { identity: "project-1", spaceFree: 1_000, spaceNeeded: 2_147_483_648 });
    assert.deepEqual(CapturePausedEvent.fromJson({ identity: "project-1", spaceFree: 1_000, spaceNeeded: 2_147_483_648 }), event);
  });

  it("refuses an identity it can't take, or a size that isn't a whole number of bytes", () => {
    assert.throws(() => new CapturePausedEvent("", 1, 1), new InvalidIdentityException(""));
    assert.throws(() => new CapturePausedEvent("project-1", -1, 1), new InvalidSizeException(-1));
    assert.throws(() => new CapturePausedEvent("project-1", 1, Number.MAX_SAFE_INTEGER + 1), new InvalidSizeException(Number.MAX_SAFE_INTEGER + 1));
  });

  it("refuses JSON with another field", () => {
    assert.throws(() => CapturePausedEvent.fromJson({ identity: "project-1", spaceFree: 1, spaceNeeded: 1, reason: "" }), new JsonException("The field is not part of this message, which accepts no unknown fields.", "CapturePausedEvent.reason"));
  });

  it("refuses JSON missing any of its fields", () => {
    const json = { identity: "project-1", spaceFree: 1_000, spaceNeeded: 2_000 };

    for (const field of Object.keys(json))
      assert.throws(() => CapturePausedEvent.fromJson(Object.fromEntries(Object.entries(json).filter(([key]) => key !== field))), new JsonException("The field is required.", `CapturePausedEvent.${field}`));
  });
});
