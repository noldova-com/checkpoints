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
  FieldNotAStringListException, FolderReference, InvalidCheckpointIdException, InvalidRelativePathException, MissingFieldException, PreviewRequest, UnknownFieldException
} from "@noldova/checkpoints.protocol";

describe("PreviewRequest", { concurrency: true }, () => {
  const folder = new FolderReference("project-1", "/work/project");
  const folderJson = { identity: "project-1", path: "/work/project" };
  const id = "019a0b6c-7d1e-7f00-8abc-0123456789ab";

  it("writes and reads its folder and checkpoint, with null paths for the whole folder", () => {
    const request = new PreviewRequest(folder, id, null);

    assert.deepEqual(request.toJson(), { folder: folderJson, checkpoint: id, paths: null });
    assert.deepEqual(PreviewRequest.fromJson({ folder: folderJson, checkpoint: id, paths: null }), request);
    assert.equal(request.paths, null);
  });

  it("writes and reads the paths it is limited to, an empty list included", () => {
    const request = new PreviewRequest(folder, id, ["src/a.txt", "docs"]);

    assert.deepEqual(request.toJson(), { folder: folderJson, checkpoint: id, paths: ["src/a.txt", "docs"] });
    assert.deepEqual(PreviewRequest.fromJson({ folder: folderJson, checkpoint: id, paths: ["src/a.txt", "docs"] }), request);
    assert.deepEqual(new PreviewRequest(folder, id, []).toJson(), { folder: folderJson, checkpoint: id, paths: [] });
    assert.deepEqual(PreviewRequest.fromJson({ folder: folderJson, checkpoint: id, paths: [] }).paths, []);
  });

  it("refuses JSON missing any of its fields, the paths included", () => {
    const json = { folder: folderJson, checkpoint: id, paths: null };

    for (const field of Object.keys(json))
      assert.throws(() => PreviewRequest.fromJson(Object.fromEntries(Object.entries(json).filter(([key]) => key !== field))), new MissingFieldException("PreviewRequest", field));
  });

  it("keeps its own copy of the paths, and refuses one that isn't a path inside the folder", () => {
    const paths = ["a.txt"];
    const request = new PreviewRequest(folder, id, paths);
    paths.length = 0;

    assert.deepEqual(request.paths, ["a.txt"]);
    for (const path of ["", "/a", "a//b", "a/./b", "../a", "a/..", "a\\b"])
      assert.throws(() => new PreviewRequest(folder, id, [path]), new InvalidRelativePathException(path));
    for (const paths of ["a.txt", ["a.txt", 1]])
      assert.throws(() => PreviewRequest.fromJson({ folder: folderJson, checkpoint: id, paths }), new FieldNotAStringListException("PreviewRequest", "paths"));
  });

  it("refuses a checkpoint id that isn't a UUID version 7", () => {
    assert.throws(() => new PreviewRequest(folder, "019a0b6c-7d1e-4f00-8abc-0123456789ab", null),
      new InvalidCheckpointIdException("019a0b6c-7d1e-4f00-8abc-0123456789ab"));
  });

  it("refuses JSON with another field", () => {
    assert.throws(() => PreviewRequest.fromJson({ folder: folderJson, checkpoint: id, paths: null, to: null }), new UnknownFieldException("PreviewRequest", "to"));
  });
});
