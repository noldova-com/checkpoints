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
  InvalidRelativePathException, UnknownUnreadReasonException, UnreadCodeMismatchException, UnreadPath, UnreadReason
} from "@noldova/checkpoints.protocol";
import { JsonException } from "@noldova/context.json";

describe("UnreadPath", { concurrency: true }, () => {
  it("writes and reads its path and reason, with a null code", () => {
    const path = new UnreadPath("src/main.ts", UnreadReason.Denied, null);

    assert.deepEqual(path.toJson(), { path: "src/main.ts", reason: "Denied", code: null });
    assert.deepEqual(UnreadPath.fromJson({ path: "src/main.ts", reason: "Denied", code: null }), path);
    assert.equal(path.code, null);
  });

  it("refuses JSON missing any of its fields, the code included", () => {
    const json = { path: "a", reason: "Denied", code: null };

    for (const field of Object.keys(json))
      assert.throws(() => UnreadPath.fromJson(Object.fromEntries(Object.entries(json).filter(([key]) => key !== field))), new JsonException("The field is required.", `UnreadPath.${field}`));
  });

  it("writes and reads the error code of an unreadable path", () => {
    const path = new UnreadPath("docs/report.pdf", UnreadReason.Unreadable, "ETIMEDOUT");

    assert.equal(path.code, "ETIMEDOUT");
    assert.deepEqual(path.toJson(), { path: "docs/report.pdf", reason: "Unreadable", code: "ETIMEDOUT" });
    assert.deepEqual(UnreadPath.fromJson({ path: "docs/report.pdf", reason: "Unreadable", code: "ETIMEDOUT" }), path);
  });

  it("refuses a code other than exactly with the Unreadable reason", () => {
    assert.throws(() => new UnreadPath("a", UnreadReason.Unreadable, null), new UnreadCodeMismatchException(UnreadReason.Unreadable));
    assert.throws(() => new UnreadPath("a", UnreadReason.Denied, "EACCES"), new UnreadCodeMismatchException(UnreadReason.Denied));
    assert.throws(() => UnreadPath.fromJson({ path: "a", reason: "Unreadable", code: null }), new UnreadCodeMismatchException(UnreadReason.Unreadable));
    assert.throws(() => UnreadPath.fromJson({ path: "a", reason: "Unreadable", code: 5 }), new JsonException("Expected a string.", "UnreadPath.code"));
  });

  it("keeps names with dots, spaces and other scripts", () => {
    assert.equal(new UnreadPath(".git~/über file.txt", UnreadReason.Changing, null).path, ".git~/über file.txt");
  });

  it("refuses a path with an empty name, or one that leaves the folder", () => {
    for (const path of ["", "/a", "a/", "a//b", "./a", "a/../b", ".."])
      assert.throws(() => new UnreadPath(path, UnreadReason.Changing, null), new InvalidRelativePathException(path));
  });

  it("refuses JSON with an unknown reason or another field", () => {
    assert.throws(() => UnreadPath.fromJson({ path: "a", reason: "Gone", code: null }), new UnknownUnreadReasonException("Gone"));
    assert.throws(() => UnreadPath.fromJson({ path: "a", reason: "Denied", code: null, size: 1 }), new JsonException("The field is not part of this message, which accepts no unknown fields.", "UnreadPath.size"));
  });
});
