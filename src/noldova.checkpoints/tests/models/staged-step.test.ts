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

import { ScriptStep } from "../../src/models/script-step.ts";
import { StagedBlob } from "../../src/models/staged-blob.ts";
import { StagedStep } from "../../src/models/staged-step.ts";

describe("StagedStep", { concurrency: true }, () => {
  it("holds a step of a restore and the content staged to put back at its path", () => {
    const step = new ScriptStep(0, "a.txt", RestoreAction.Replace, ".~r1/0", ".~r1/0.old", PathKind.File, "a".repeat(40), null);
    const blob = new StagedBlob("a".repeat(40), "/module/.~r1/0.old.tmp", PathKind.File, null);

    const staged = new StagedStep(step, blob);

    assert.deepEqual([staged.step, staged.blob], [step, blob]);
  });
});
