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
  FieldNotANumberException, FolderUsage, InvalidFolderPathException, InvalidIdentityException, InvalidSizeException, MissingFieldException, UnknownFieldException
} from "@noldova/checkpoints.protocol";

describe("FolderUsage", { concurrency: true }, () => {
  it("writes and reads its identity, path and bytes", () => {
    const usage = new FolderUsage("project-7", "C:\\work\\project", 4096);

    assert.deepEqual(usage.toJson(), { identity: "project-7", path: "C:\\work\\project", bytes: 4096 });
    assert.deepEqual(FolderUsage.fromJson({ identity: "project-7", path: "C:\\work\\project", bytes: 4096 }), usage);
  });

  it("takes no path when the store can't say one, and no bytes", () => {
    const usage = new FolderUsage("a", null, 0);

    assert.deepEqual(usage.toJson(), { identity: "a", path: null, bytes: 0 });
    assert.deepEqual(FolderUsage.fromJson(usage.toJson()), usage);
  });

  it("refuses an identity, a path or a size that isn't valid", () => {
    assert.throws(() => new FolderUsage("a_b", "/", 0), new InvalidIdentityException("a_b"));
    assert.throws(() => new FolderUsage("a", "project", 0), new InvalidFolderPathException("project"));
    for (const bytes of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN])
      assert.throws(() => new FolderUsage("a", "/", bytes), new InvalidSizeException(bytes));
  });

  it("refuses JSON with another field, a missing one, or bytes that aren't a number", () => {
    assert.throws(() => FolderUsage.fromJson({ identity: "a", path: "/", bytes: 0, time: "x" }), new UnknownFieldException("FolderUsage", "time"));
    assert.throws(() => FolderUsage.fromJson({ identity: "a", bytes: 0 }), new MissingFieldException("FolderUsage", "path"));
    assert.throws(() => FolderUsage.fromJson({ identity: "a", path: "/", bytes: "0" }), new FieldNotANumberException("FolderUsage", "bytes"));
  });

  it("refuses JSON missing any of its fields", () => {
    const json = { identity: "project-7", path: "/work/project", bytes: 4096 };

    for (const field of Object.keys(json))
      assert.throws(() => FolderUsage.fromJson(Object.fromEntries(Object.entries(json).filter(([key]) => key !== field))), new MissingFieldException("FolderUsage", field));
  });
});
