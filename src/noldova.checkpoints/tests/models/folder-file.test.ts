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
import { FolderFile } from "../../src/models/folder-file.ts";

describe("FolderFile", { concurrency: true }, () => {
  it("holds the folder now's file by its kind and object, with where it is, its size and its file id", () => {
    const file = new FolderFile(EntryKind.Link, "id-2", "/work/project/out", 7, "5:9");

    assert.deepEqual([file.kind, file.objectId, file.location, file.size, file.fileId], [PathKind.Link, "id-2", "/work/project/out", 7, "5:9"]);
  });
});
