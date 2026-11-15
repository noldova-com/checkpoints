/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PathKind } from "@noldova/checkpoints.protocol";

import { EntryKind } from "../../src/models/entry-kind.ts";
import { TreeFile } from "../../src/models/tree-file.ts";

describe("TreeFile", { concurrency: true }, () => {
  it("holds a checkpoint's file by its kind and object", () => {
    const file = new TreeFile(EntryKind.Executable, "id-1");

    assert.deepEqual([file.kind, file.objectId], [PathKind.Executable, "id-1"]);
  });
});
