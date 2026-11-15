/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InvalidIdentityException, InvalidRelativePathException, RestoreHeldUpEvent } from "@noldova/checkpoints.protocol";
import { JsonException } from "@noldova/context.json";

describe("RestoreHeldUpEvent", { concurrency: true }, () => {
  it("writes and reads the folder's identity and the paths it couldn't change", () => {
    const event = new RestoreHeldUpEvent("project-1", ["db/locked.sqlite", "über.txt"]);

    assert.deepEqual(event.toJson(), { identity: "project-1", paths: ["db/locked.sqlite", "über.txt"] });
    assert.deepEqual(RestoreHeldUpEvent.fromJson({ identity: "project-1", paths: ["db/locked.sqlite", "über.txt"] }), event);
  });

  it("keeps its own copy of the paths it was given", () => {
    const paths = ["a"];
    const event = new RestoreHeldUpEvent("project-1", paths);
    paths.length = 0;

    assert.deepEqual(event.paths, ["a"]);
  });

  it("refuses an identity it can't take, or a path that leaves the folder", () => {
    assert.throws(() => new RestoreHeldUpEvent("", []), new InvalidIdentityException(""));
    assert.throws(() => new RestoreHeldUpEvent("project-1", ["../a"]), new InvalidRelativePathException("../a"));
  });

  it("refuses JSON whose paths aren't strings, or with another field", () => {
    assert.throws(() => RestoreHeldUpEvent.fromJson({ identity: "project-1", paths: [1] }),
      new JsonException("Expected a string.", "RestoreHeldUpEvent.paths.0"));
    assert.throws(() => RestoreHeldUpEvent.fromJson({ identity: "project-1", paths: [], reason: "" }), new JsonException("The field is not part of this message, which accepts no unknown fields.", "RestoreHeldUpEvent.reason"));
  });

  it("refuses JSON missing any of its fields", () => {
    const json = { identity: "project-1", paths: ["a.txt"] };

    for (const field of Object.keys(json))
      assert.throws(() => RestoreHeldUpEvent.fromJson(Object.fromEntries(Object.entries(json).filter(([key]) => key !== field))), new JsonException("The field is required.", `RestoreHeldUpEvent.${field}`));
  });
});
