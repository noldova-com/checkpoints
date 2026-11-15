/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DiffTarget, FolderReference, InvalidCheckpointIdException, InvalidReadLimitException, InvalidRelativePathException, MissingFieldException, ReadRequest,
  UnknownFieldException
} from "@noldova/checkpoints.protocol";

describe("ReadRequest", { concurrency: true }, () => {
  const folder = new FolderReference("project-1", "/work/project");
  const folderJson = { identity: "project-1", path: "/work/project" };
  const id = "019a0b6c-7d1e-7f00-8abc-0123456789ab";

  it("writes and reads a read of a file's content, and of its line diff with the folder now", () => {
    assert.deepEqual(new ReadRequest(folder, id, "src/a.ts", null, 100).toJson(), { folder: folderJson, checkpoint: id, path: "src/a.ts", against: null, limit: 100 });
    assert.deepEqual(ReadRequest.fromJson({ folder: folderJson, checkpoint: id, path: "a", against: { checkpoint: null }, limit: 1 }),
      new ReadRequest(folder, id, "a", new DiffTarget(null), 1));
    assert.equal(ReadRequest.method, "checkpoints.read");
  });

  it("writes and reads a read of its line diff with another checkpoint, and one of its content from JSON", () => {
    const other = "019a0b6c-7d1e-7f00-8abc-0123456789ac";

    assert.deepEqual(new ReadRequest(folder, id, "a", new DiffTarget(other), 5).toJson(), { folder: folderJson, checkpoint: id, path: "a", against: { checkpoint: other }, limit: 5 });
    assert.deepEqual(ReadRequest.fromJson({ folder: folderJson, checkpoint: id, path: "a/b", against: null, limit: 5 }), new ReadRequest(folder, id, "a/b", null, 5));
  });

  it("refuses an id that isn't a UUID of version 7, and a path with an empty name or one that leaves the folder", () => {
    assert.throws(() => new ReadRequest(folder, "a", "a", null, 1), new InvalidCheckpointIdException("a"));
    for (const path of ["", "a/", "../a", "a/./b"])
      assert.throws(() => new ReadRequest(folder, id, path, null, 1), new InvalidRelativePathException(path));
  });

  it("refuses a limit that isn't a whole number from 1 to 16 MiB", () => {
    assert.throws(() => new ReadRequest(folder, id, "a", null, 0),
      new InvalidReadLimitException(0));
    assert.doesNotThrow(() => new ReadRequest(folder, id, "a", null, 16 * 1024 * 1024));
    for (const limit of [16 * 1024 * 1024 + 1, 1.5, Number.NaN])
      assert.throws(() => new ReadRequest(folder, id, "a", null, limit), new InvalidReadLimitException(limit));
  });

  it("refuses JSON with another field", () => {
    assert.throws(() => ReadRequest.fromJson({ folder: folderJson, checkpoint: id, path: "a", against: null, limit: 1, offset: 0 }), new UnknownFieldException("ReadRequest", "offset"));
  });

  it("refuses JSON missing any of its fields", () => {
    const json = { folder: { identity: "project-1", path: "/work/project" }, checkpoint: "019a0b6c-7d1e-7f00-8abc-0123456789ab", path: "a", against: null, limit: 1 };

    for (const field of Object.keys(json))
      assert.throws(() => ReadRequest.fromJson(Object.fromEntries(Object.entries(json).filter(([key]) => key !== field))), new MissingFieldException("ReadRequest", field));
  });
});
