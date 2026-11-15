/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ChangeSide, InvalidSizeException, PathKind, SideSizeMismatchException } from "@noldova/checkpoints.protocol";
import { JsonException } from "@noldova/context.json";

describe("ChangeSide", { concurrency: true }, () => {
  it("writes and reads a file's kind, size and whether it's text", () => {
    const side = new ChangeSide(PathKind.Executable, 12, true);

    assert.deepEqual(side.toJson(), { kind: "Executable", size: 12, isText: true });
    assert.deepEqual(ChangeSide.fromJson({ kind: "Executable", size: 12, isText: true }), side);
  });

  it("writes and reads a folder, which has no size and is never text", () => {
    assert.deepEqual(ChangeSide.fromJson({ kind: "Folder", size: null, isText: false }), new ChangeSide(PathKind.Folder, null, false));
  });

  it("refuses a size on a folder, none on another kind, a folder as text, and a size that isn't a whole number of 0 or more", () => {
    assert.throws(() => new ChangeSide(PathKind.Folder, 0, false),
      new SideSizeMismatchException(PathKind.Folder));
    assert.throws(() => new ChangeSide(PathKind.Link, null, true), new SideSizeMismatchException(PathKind.Link));
    assert.throws(() => new ChangeSide(PathKind.Folder, null, true), new SideSizeMismatchException(PathKind.Folder));
    assert.throws(() => new ChangeSide(PathKind.File, -1, true), new InvalidSizeException(-1));
    assert.throws(() => new ChangeSide(PathKind.File, 1.5, true), new InvalidSizeException(1.5));
  });

  it("refuses JSON with another field", () => {
    assert.throws(() => ChangeSide.fromJson({ kind: "File", size: 1, isText: true, mode: "100644" }), new JsonException("The field is not part of this message, which accepts no unknown fields.", "ChangeSide.mode"));
  });

  it("refuses JSON missing any of its fields", () => {
    const json = { kind: "File", size: 1, isText: true };

    for (const field of Object.keys(json))
      assert.throws(() => ChangeSide.fromJson(Object.fromEntries(Object.entries(json).filter(([key]) => key !== field))), new JsonException("The field is required.", `ChangeSide.${field}`));
  });
});
