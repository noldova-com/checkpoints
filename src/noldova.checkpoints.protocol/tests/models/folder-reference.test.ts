/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FolderReference, InvalidFolderPathException, InvalidIdentityException } from "@noldova/checkpoints.protocol";
import { JsonException } from "@noldova/context.json";

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

  it("takes an identity of 1 to 64 lower-case letters, digits or hyphens, and refuses any other", () => {
    assert.equal(new FolderReference("a".repeat(64), "/").identity, "a".repeat(64));
    for (const identity of ["", "a".repeat(65), "Case-1", "a_b", "a b", "é"])
      assert.throws(() => new FolderReference(identity, "/"), new InvalidIdentityException(identity));
  });

  it("refuses JSON with another field or a missing one", () => {
    assert.throws(() => FolderReference.fromJson({ identity: "a", path: "/", name: "x" }), new JsonException("The field is not part of this message, which accepts no unknown fields.", "FolderReference.name"));
    assert.throws(() => FolderReference.fromJson({ identity: "a" }), new JsonException("The field is required.", "FolderReference.path"));
  });

  it("refuses JSON missing any of its fields", () => {
    const json = { identity: "project-7", path: "/work/project" };

    for (const field of Object.keys(json))
      assert.throws(() => FolderReference.fromJson(Object.fromEntries(Object.entries(json).filter(([key]) => key !== field))), new JsonException("The field is required.", `FolderReference.${field}`));
  });
});
