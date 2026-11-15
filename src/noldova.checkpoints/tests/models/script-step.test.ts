/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PathKind, RestoreAction, UnknownFieldException } from "@noldova/checkpoints.protocol";

import { JournalFieldMissingException } from "../../src/api/index.ts";
import { LinkKind } from "../../src/models/link-kind.ts";
import { ScriptStep } from "../../src/models/script-step.ts";

describe("ScriptStep", { concurrency: true }, () => {
  it("writes and reads a step, with what it stages and moves aside and what the checkpoint holds", () => {
    const step = new ScriptStep(2, "dir/link", RestoreAction.Replace, ".~r/2", ".~r/2.old", PathKind.Link, "c".repeat(40), LinkKind.File);
    const json = step.toJson();

    assert.deepEqual(json, {
      index: 2, path: "dir/link", action: "Replace", stage: ".~r/2", aside: ".~r/2.old", kind: "Link", objectId: "c".repeat(40), linkKind: "File"
    });
    assert.deepEqual(ScriptStep.fromJson(json), step);
  });

  it("writes and reads a deletion, which stages nothing and has no kind", () => {
    const step = new ScriptStep(0, "old", RestoreAction.Delete, null, ".~r/0.old", null, null, null);

    assert.deepEqual(ScriptStep.fromJson(step.toJson()), step);
  });

  it("reads what a step stages and moves aside, and fails naming what a step lacks", () => {
    const replace = new ScriptStep(2, "a", RestoreAction.Replace, ".~r/2", ".~r/2.old", PathKind.File, "c".repeat(40), null);
    const remove = new ScriptStep(0, "old", RestoreAction.Delete, null, null, null, null, null);

    assert.deepEqual([replace.readStage(), replace.readAside(), replace.readKind(), replace.readObjectId()], [".~r/2", ".~r/2.old", PathKind.File, "c".repeat(40)]);
    assert.throws(() => remove.readStage(), new JournalFieldMissingException("ScriptStep", "stage"));
    assert.throws(() => remove.readAside(), new JournalFieldMissingException("ScriptStep", "aside"));
    assert.throws(() => remove.readKind(), new JournalFieldMissingException("ScriptStep", "kind"));
    assert.throws(() => remove.readObjectId(), new JournalFieldMissingException("ScriptStep", "objectId"));
  });

  it("refuses a field it doesn't know", () => {
    const json = new ScriptStep(0, "a", RestoreAction.Write, ".~r/0", null, PathKind.File, "d".repeat(40), null).toJson();

    assert.throws(() => ScriptStep.fromJson({ ...json, extra: 1 }), new UnknownFieldException("ScriptStep", "extra"));
  });
});
