/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { StoreAnswersMismatchException } from "../../src/exceptions/store-answers-mismatch.exception.ts";
import { ObjectBatch } from "../../src/models/object-batch.ts";
import { StoredObject } from "../../src/models/stored-object.ts";

describe("ObjectBatch", { concurrency: true }, () => {
  it("gives each object by the name asked for it, in the order the names were asked", () => {
    const a = new StoredObject("blob", 1, Buffer.from("a"));
    const b = new StoredObject("blob", 1, Buffer.from("b"));

    const batch = new ObjectBatch(["n1", "n2"], [a, b]);

    assert.deepEqual([batch.get("n1"), batch.get("n2")], [a, b]);
  });

  it("gives a name it wasn't asked as missing", () => {
    const batch = new ObjectBatch(["n1"], [new StoredObject("blob", 0, Buffer.alloc(0))]);

    assert.equal(batch.get("other"), StoredObject.Missing);
  });

  it("refuses fewer or more answers than names", () => {
    const answer = new StoredObject("blob", 0, Buffer.alloc(0));

    assert.throws(() => new ObjectBatch(["n1", "n2"], [answer]), new StoreAnswersMismatchException(2, 1));
    assert.throws(() => new ObjectBatch(["n1"], [answer, answer]), new StoreAnswersMismatchException(1, 2));
  });
});
