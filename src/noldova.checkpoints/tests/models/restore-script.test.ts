/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PathKind, RestoreAction } from "@noldova/checkpoints.protocol";
import { JsonException } from "@noldova/context.json";

import { ScriptStepMissingException, UnsupportedStoreFormatException } from "../../src/api/index.ts";
import { LinkKind } from "../../src/models/link-kind.ts";
import { RestoreScript } from "../../src/models/restore-script.ts";
import { ScriptStep } from "../../src/models/script-step.ts";

describe("RestoreScript", { concurrency: true }, () => {
  const checkpoint = "01890a5d-ac96-774b-bcce-b302099a8057";
  const before = "01890a5d-ac96-774b-bcce-b302099a8058";
  const steps = [
    new ScriptStep(0, "a.txt", RestoreAction.Replace, ".~r1/0", ".~r1/0.old", PathKind.File, "a".repeat(40), null),
    new ScriptStep(1, "dir/link", RestoreAction.Write, ".~r1/1", null, PathKind.Link, "b".repeat(40), LinkKind.Folder),
    new ScriptStep(2, "dir/old", RestoreAction.Delete, null, ".~r1/2.old", null, null, null)
  ];
  const script = new RestoreScript("r1", checkpoint, before, steps, ["dir"], ["gone"], new Map([["", "1:2"], ["gone", "1:3"]]));

  it("writes and reads a script whole, with its steps, folders and file ids", () => {
    const json = script.toJson();
    const read = RestoreScript.fromJson(JSON.parse(JSON.stringify(json)));

    assert.deepEqual(read.toJson(), json);
    assert.equal(read.staging, ".~r1");
    assert.deepEqual([...read.folders], [["", "1:2"], ["gone", "1:3"]]);
    assert.equal(read.steps[1]?.linkKind, LinkKind.Folder);
    assert.equal(read.steps[2]?.kind, null);
  });

  it("gives a step by its index, and fails naming one it doesn't hold", () => {
    assert.equal(script.stepAt(1).path, "dir/link");
    assert.throws(() => script.stepAt(3), new ScriptStepMissingException(3));
  });

  it("moves aside the steps that replace or delete, the deepest first", () => {
    assert.deepEqual(script.asideOrder.map(t => t.path), ["dir/old", "a.txt"]);
  });

  it("refuses a field it doesn't know, a folder's file id that isn't text, and a format it doesn't read", () => {
    const json = script.toJson();

    assert.throws(() => RestoreScript.fromJson({ ...json, extra: 1 }), new JsonException("The field is not part of this message, which accepts no unknown fields.", "RestoreScript.extra"));
    assert.throws(() => RestoreScript.fromJson({ ...json, folders: { "": 1 } }), new JsonException("Expected a string.", "RestoreScript.folders."));
    assert.throws(() => RestoreScript.fromJson({ ...json, folders: [] }), new JsonException("Expected an object.", "RestoreScript.folders"));
    assert.throws(() => RestoreScript.fromJson({ ...json, folders: "a" }), new JsonException("Expected an object.", "RestoreScript.folders"));
    assert.throws(() => RestoreScript.fromJson({ ...json, folders: null }), new JsonException("Null is not an accepted value here.", "RestoreScript.folders"));
    assert.throws(() => RestoreScript.fromJson({ ...json, formatVersion: 2 }), new UnsupportedStoreFormatException("2"));
  });
});
