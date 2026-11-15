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
import { SideContent } from "../../src/models/side-content.ts";
import { TreeFile } from "../../src/models/tree-file.ts";
import { UnhashedFile } from "../../src/models/unhashed-file.ts";

describe("SideContent", { concurrency: true }, () => {
  it("holds a side's file and the content read of it", () => {
    const stored = new TreeFile(EntryKind.File, "id-1");
    const found = new UnhashedFile("/work/project/a.txt", "5:9");

    const checkpoint = new SideContent(stored, Buffer.from("alpha"));
    const now = new SideContent(found, Buffer.from("beta"));

    assert.deepEqual([checkpoint.file, checkpoint.content, now.file, now.content], [stored, Buffer.from("alpha"), found, Buffer.from("beta")]);
  });
});
