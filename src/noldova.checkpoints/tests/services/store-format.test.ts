/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { JsonObjectReader } from "@noldova/checkpoints.protocol";

import { StoreFieldNotAStringListException, UnsupportedStoreFormatException } from "../../src/api/index.ts";
import { StoreFormat } from "../../src/services/store-format.ts";

describe("StoreFormat", { concurrency: true }, () => {
  it("accepts the format version this module writes", () => {
    assert.doesNotThrow(() => StoreFormat.check(new JsonObjectReader({ formatVersion: 1 }, "Index")));
  });

  it("refuses any other format version, naming it", () => {
    assert.throws(() => StoreFormat.check(new JsonObjectReader({ formatVersion: 2 }, "Index")),
      new UnsupportedStoreFormatException("2"));
  });

  it("gives the format version of a file that names one of the versions it reads, and refuses any other", () => {
    assert.equal(StoreFormat.readVersion(new JsonObjectReader({ formatVersion: 1 }, "Record"), [1, 2]), 1);
    assert.equal(StoreFormat.readVersion(new JsonObjectReader({ formatVersion: 2 }, "Record"), [1, 2]), 2);
    assert.throws(() => StoreFormat.readVersion(new JsonObjectReader({ formatVersion: 3 }, "Record"), [1, 2]),
      new UnsupportedStoreFormatException("3"));
  });

  it("reads a list of text, and refuses one holding anything else", () => {
    assert.deepEqual(StoreFormat.readStringList(new JsonObjectReader({ names: ["a", "b"] }, "Record"), "names"), ["a", "b"]);
    assert.throws(() => StoreFormat.readStringList(new JsonObjectReader({ names: ["a", null] }, "Record"), "names"),
      new StoreFieldNotAStringListException("names"));
  });
});
