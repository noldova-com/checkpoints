/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FolderUsage, StorageList } from "@noldova/checkpoints.protocol";
import { JsonException } from "@noldova/context.json";

describe("StorageList", { concurrency: true }, () => {
  const larger = new FolderUsage("b", "/work/b", 2048);
  const smaller = new FolderUsage("a", null, 1024);

  it("writes and reads its folders in their order", () => {
    const list = new StorageList([larger, smaller]);

    assert.deepEqual(list.toJson(), { folders: [larger.toJson(), smaller.toJson()] });
    assert.deepEqual(StorageList.fromJson(list.toJson()), list);
  });

  it("keeps its own copy of the folders it was given", () => {
    const folders = [larger];
    const list = new StorageList(folders);
    folders.push(smaller);

    assert.equal(list.folders.length, 1);
  });

  it("refuses JSON whose folders aren't a list, or with another field", () => {
    assert.throws(() => StorageList.fromJson({ folders: {} }), new JsonException("Expected an array.", "StorageList.folders"));
    assert.throws(() => StorageList.fromJson({ folders: [], bytes: 0 }), new JsonException("The field is not part of this message, which accepts no unknown fields.", "StorageList.bytes"));
  });

  it("refuses JSON missing any of its fields", () => {
    const json = { folders: [] };

    for (const field of Object.keys(json))
      assert.throws(() => StorageList.fromJson(Object.fromEntries(Object.entries(json).filter(([key]) => key !== field))), new JsonException("The field is required.", `StorageList.${field}`));
  });
});
