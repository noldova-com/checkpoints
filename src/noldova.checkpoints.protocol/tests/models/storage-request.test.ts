/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { NotAnObjectException, StorageRequest, UnknownFieldException } from "@noldova/checkpoints.protocol";

describe("StorageRequest", { concurrency: true }, () => {
  it("is the checkpoints.storage method", () => {
    assert.equal(StorageRequest.method, "checkpoints.storage");
  });

  it("writes and reads an empty object", () => {
    assert.deepEqual(new StorageRequest().toJson(), {});
    assert.deepEqual(StorageRequest.fromJson({}), new StorageRequest());
  });

  it("refuses JSON with a field, or that isn't an object", () => {
    assert.throws(() => StorageRequest.fromJson({ folder: { identity: "a", path: "/" } }), new UnknownFieldException("StorageRequest", "folder"));
    assert.throws(() => StorageRequest.fromJson(null), new NotAnObjectException("StorageRequest"));
  });
});
