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
import { SideFolder } from "../../src/models/side-folder.ts";
import { TreeFile } from "../../src/models/tree-file.ts";

describe("SideFolder", { concurrency: true }, () => {
  it("is one folder of either side, the same as itself and never as a file", () => {
    assert.equal(SideFolder.Instance.kind, PathKind.Folder);
    assert.equal(SideFolder.Instance.isSameAs(SideFolder.Instance), true);
    assert.equal(SideFolder.Instance.isSameAs(new TreeFile(EntryKind.File, "id-1")), false);
  });
});
