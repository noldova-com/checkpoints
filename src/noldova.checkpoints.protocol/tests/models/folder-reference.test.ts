/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FolderReference, InvalidFolderPathException, InvalidIdentityException, MissingFieldException, UnknownFieldException } from "@noldova/checkpoints.protocol";

describe("FolderReference", { concurrency: true }, () => {
  it("writes and reads its identity and path", () => {
    const folder = new FolderReference("project-7", "/work/project");

    assert.deepEqual(folder.toJson(), { identity: "project-7", path: "/work/project" });
    assert.deepEqual(FolderReference.fromJson({ identity: "project-7", path: "/work/project" }), folder);
  });

  it("takes an absolute path on macOS and Linux, on a Windows drive, or on a Windows share", () => {
    for (const path of ["/", "C:\\work\\project", "d:/project", "\\\\server\\share\\project"])
      assert.equal(new FolderReference("a", path).path, path);
  });

  it("refuses a relative path", () => {
    for (const path of ["project", "./project", "C:project", "\\\\server", ""])
      assert.throws(() => new FolderReference("a", path), new InvalidFolderPathException(path));
  });

  it("takes an identity of 1 to 64 letters, digits or hyphens, and refuses any other", () => {
    assert.equal(new FolderReference("A".repeat(64), "/").identity, "A".repeat(64));
    for (const identity of ["", "A".repeat(65), "a_b", "a b", "é"])
      assert.throws(() => new FolderReference(identity, "/"), new InvalidIdentityException(identity));
  });

  it("refuses JSON with another field or a missing one", () => {
    assert.throws(() => FolderReference.fromJson({ identity: "a", path: "/", name: "x" }), new UnknownFieldException("FolderReference", "name"));
    assert.throws(() => FolderReference.fromJson({ identity: "a" }), new MissingFieldException("FolderReference", "path"));
  });

  it("refuses JSON missing any of its fields", () => {
    const json = { identity: "project-7", path: "/work/project" };

    for (const field of Object.keys(json))
      assert.throws(() => FolderReference.fromJson(Object.fromEntries(Object.entries(json).filter(([key]) => key !== field))), new MissingFieldException("FolderReference", field));
  });
});
