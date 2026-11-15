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
  Change, ChangeSide, ChangeSidesMismatchException, ChangeStatus, InvalidRelativePathException, PathKind, UnreadReason, UnreadReasonMismatchException
} from "@noldova/checkpoints.protocol";
import { JsonException } from "@noldova/context.json";

describe("Change", { concurrency: true }, () => {
  const file = new ChangeSide(PathKind.File, 3, true);
  const fileJson = { kind: "File", size: 3, isText: true };
  const link = new ChangeSide(PathKind.Link, 5, true);

  it("writes and reads a change with both sides", () => {
    const change = new Change("src/a.ts", ChangeStatus.KindChanged, file, link, null);

    assert.deepEqual(change.toJson(), {
      path: "src/a.ts", status: "KindChanged", before: fileJson, after: { kind: "Link", size: 5, isText: true }, unreadReason: null
    });
    assert.deepEqual(Change.fromJson(change.toJson()), change);
  });

  it("writes and reads an added and a deleted path, each with only its one side", () => {
    assert.deepEqual(Change.fromJson({ path: "a", status: "Added", before: null, after: fileJson, unreadReason: null }),
      new Change("a", ChangeStatus.Added, null, file, null));
    assert.deepEqual(Change.fromJson({ path: "a", status: "Deleted", before: fileJson, after: null, unreadReason: null }),
      new Change("a", ChangeStatus.Deleted, file, null, null));
  });

  it("writes and reads an unknown change with its reason and each side a side could tell", () => {
    const change = new Change("secret.txt", ChangeStatus.Unknown, file, null, UnreadReason.Denied);

    assert.equal(change.toJson()["unreadReason"], "Denied");
    assert.deepEqual(Change.fromJson(change.toJson()), change);
    assert.doesNotThrow(() => new Change("a", ChangeStatus.Unknown, null, null, UnreadReason.Changing));
  });

  it("refuses sides that don't fit the status", () => {
    assert.throws(() => new Change("a", ChangeStatus.Added, file, file, null), new ChangeSidesMismatchException(ChangeStatus.Added));
    assert.throws(() => new Change("a", ChangeStatus.Deleted, file, file, null), new ChangeSidesMismatchException(ChangeStatus.Deleted));
    assert.throws(() => new Change("a", ChangeStatus.Modified, null, file, null), new ChangeSidesMismatchException(ChangeStatus.Modified));
    assert.throws(() => new Change("a", ChangeStatus.Modified, file, null, null), new ChangeSidesMismatchException(ChangeStatus.Modified));
  });

  it("refuses a reason on a change that isn't unknown, and none on one that is", () => {
    assert.throws(() => new Change("a", ChangeStatus.Modified, file, file, UnreadReason.Denied),
      new UnreadReasonMismatchException(ChangeStatus.Modified));
    assert.throws(() => new Change("a", ChangeStatus.Unknown, file, file, null), new UnreadReasonMismatchException(ChangeStatus.Unknown));
  });

  it("refuses a path with an empty name, or one that leaves the folder, and JSON with another field", () => {
    for (const path of ["", "a/", "a//b", "../a", "a/./b"])
      assert.throws(() => new Change(path, ChangeStatus.Added, null, file, null), new InvalidRelativePathException(path));
    assert.throws(() => Change.fromJson({ path: "a", status: "Added", before: null, after: fileJson, unreadReason: null, renamed: null }), new JsonException("The field is not part of this message, which accepts no unknown fields.", "Change.renamed"));
  });

  it("refuses JSON missing any of its fields", () => {
    const json = { path: "a", status: "Added", before: null, after: { kind: "File", size: 3, isText: true }, unreadReason: null };

    for (const field of Object.keys(json))
      assert.throws(() => Change.fromJson(Object.fromEntries(Object.entries(json).filter(([key]) => key !== field))), new JsonException("The field is required.", `Change.${field}`));
  });
});
