/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { JsonException, JsonReader } from "@noldova/context.json";

import { UnsupportedStoreFormatException } from "../../src/api/index.ts";
import { StoreFormat } from "../../src/services/store-format.ts";

describe("StoreFormat", { concurrency: true }, () => {
  const unknownField = "The field is not part of this record, which accepts no unknown fields.";

  it("accepts the format version this module writes", () => {
    assert.doesNotThrow(() => StoreFormat.check(JsonReader.fromValue({ formatVersion: 1 }, "Index")));
  });

  it("refuses any other format version, naming it, and a file that names none", () => {
    assert.throws(() => StoreFormat.check(JsonReader.fromValue({ formatVersion: 2 }, "Index")),
      new UnsupportedStoreFormatException("2"));
    assert.throws(() => StoreFormat.check(JsonReader.fromValue({}, "Index")), new JsonException("The field is required.", "Index.formatVersion"));
  });

  it("gives the format version of a file that names one of the versions it reads, and refuses any other", () => {
    assert.equal(StoreFormat.readVersion(JsonReader.fromValue({ formatVersion: 1 }, "Record"), [1, 2]), 1);
    assert.equal(StoreFormat.readVersion(JsonReader.fromValue({ formatVersion: 2 }, "Record"), [1, 2]), 2);
    assert.throws(() => StoreFormat.readVersion(JsonReader.fromValue({ formatVersion: 3 }, "Record"), [1, 2]),
      new UnsupportedStoreFormatException("3"));
  });

  it("reads a JSON object with only the record's fields, at the record's path", () => {
    const reader = StoreFormat.read({ text: "a" }, "Record", ["text", "other"]);

    assert.equal(reader.path, "Record");
    assert.equal(reader.readString("text"), "a");
  });

  it("refuses a value that isn't a JSON object, and a field the record doesn't have", () => {
    for (const value of [null, [], "text"])
      assert.throws(() => StoreFormat.read(value, "Record", []), new JsonException("Expected a JSON object.", "Record"));
    assert.throws(() => StoreFormat.read({ text: "a", other: 1 }, "Record", ["text"]), new JsonException(unknownField, "Record.other"));
  });

  it("refuses a field the record doesn't have even when its value is undefined, which JSON drops", () => {
    assert.throws(() => StoreFormat.read({ text: "a", other: undefined }, "Record", ["text"]), new JsonException(unknownField, "Record.other"));
  });

  it("reads an array of any items, and refuses another value", () => {
    const reader = StoreFormat.read({ list: [1, "a", null], text: "a" }, "Record", ["list", "text"]);

    assert.deepEqual(StoreFormat.readArray(reader, "list"), [1, "a", null]);
    assert.throws(() => StoreFormat.readArray(reader, "text"), new JsonException("Expected an array.", "Record.text"));
  });

  it("reads a number or null, and refuses another value", () => {
    const reader = StoreFormat.read({ number: 2, empty: null, text: "a" }, "Record", ["number", "empty", "text"]);

    assert.equal(StoreFormat.readNullableNumber(reader, "number"), 2);
    assert.equal(StoreFormat.readNullableNumber(reader, "empty"), null);
    assert.throws(() => StoreFormat.readNullableNumber(reader, "text"), new JsonException("Expected a number.", "Record.text"));
  });
});
