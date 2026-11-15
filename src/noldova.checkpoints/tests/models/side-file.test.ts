/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { EntryKind } from "../../src/models/entry-kind.ts";
import { FolderFile } from "../../src/models/folder-file.ts";
import { SideFolder } from "../../src/models/side-folder.ts";
import { TreeFile } from "../../src/models/tree-file.ts";

describe("SideFile", { concurrency: true }, () => {
  it("is the same as a side of the same kind and content, wherever each side is", () => {
    assert.equal(new TreeFile(EntryKind.File, "id-1").isSameAs(new FolderFile(EntryKind.File, "id-1", "/a", 1, "5:9")), true);
    assert.equal(new FolderFile(EntryKind.File, "id-1", "/a", 1, "5:9").isSameAs(new TreeFile(EntryKind.File, "id-1")), true);
    assert.equal(new TreeFile(EntryKind.File, "id-1").isSameAs(new TreeFile(EntryKind.File, "id-2")), false);
    assert.equal(new TreeFile(EntryKind.File, "id-1").isSameAs(new TreeFile(EntryKind.Executable, "id-1")), false);
    assert.equal(new TreeFile(EntryKind.File, "id-1").isSameAs(SideFolder.Instance), false);
  });
});
