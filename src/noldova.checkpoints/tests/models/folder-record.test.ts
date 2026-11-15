/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { UnsupportedStoreFormatException } from "../../src/api/index.ts";
import { FolderRecord } from "../../src/models/folder-record.ts";

describe("FolderRecord", { concurrency: true }, () => {
  it("writes and reads the folder's last path, with its format version", () => {
    const json = new FolderRecord("/work/project").toJson();

    assert.deepEqual(json, { formatVersion: 1, path: "/work/project" });
    assert.equal(FolderRecord.fromJson(json).path, "/work/project");
  });

  it("refuses a record of a format version it doesn't read", () => {
    assert.throws(() => FolderRecord.fromJson({ formatVersion: "1", path: "/p" }), new UnsupportedStoreFormatException("1"));
  });
});
