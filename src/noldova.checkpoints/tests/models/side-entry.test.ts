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
import { SideFolder } from "../../src/models/side-folder.ts";
import { TreeFile } from "../../src/models/tree-file.ts";

describe("SideEntry", { concurrency: true }, () => {
  it("takes an executable file as the same kind as a plain one, and a link or a folder as another", () => {
    const file = new TreeFile(EntryKind.File, "id-1");

    assert.equal(file.isOtherKindThan(new TreeFile(EntryKind.Executable, "id-1")), false);
    assert.equal(new TreeFile(EntryKind.Executable, "id-1").isOtherKindThan(file), false);
    assert.equal(file.isOtherKindThan(new TreeFile(EntryKind.Link, "id-1")), true);
    assert.equal(file.isOtherKindThan(SideFolder.Instance), true);
    assert.equal(SideFolder.Instance.isOtherKindThan(file), true);
  });
});
