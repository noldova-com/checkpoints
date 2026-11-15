/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { StoredObject } from "../../src/models/stored-object.ts";

describe("StoredObject", { concurrency: true }, () => {
  it("tells a blob from another type, and a missing name from both", () => {
    assert.deepEqual([new StoredObject("blob", 1, Buffer.from("a")).isBlob, new StoredObject("tree", 0, Buffer.alloc(0)).isBlob], [true, false]);
    assert.deepEqual([StoredObject.Missing.type, StoredObject.Missing.size, StoredObject.Missing.isBlob], ["missing", 0, false]);
  });

  it("is whole when the reading kept all its content, and not when it kept only the start", () => {
    assert.equal(new StoredObject("blob", 3, Buffer.from("abc")).isWhole, true);
    assert.equal(new StoredObject("blob", 3, Buffer.from("ab")).isWhole, false);
  });
});
