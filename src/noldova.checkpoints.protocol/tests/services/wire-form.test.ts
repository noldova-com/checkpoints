/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { JsonException } from "@noldova/context.json";

import { WireForm } from "../../src/services/wire-form.ts";

describe("WireForm", { concurrency: true }, () => {
  const unknownField = "The field is not part of this message, which accepts no unknown fields.";

  it("reads a JSON object with only the model's fields, at the model's path", () => {
    const reader = WireForm.read({ text: "a" }, "Model", ["text", "other"]);

    assert.equal(reader.path, "Model");
    assert.equal(reader.readString("text"), "a");
  });

  it("refuses a value that isn't a JSON object, and a field the model doesn't have", () => {
    for (const value of [null, [], "text"])
      assert.throws(() => WireForm.read(value, "Model", []), new JsonException("Expected a JSON object.", "Model"));
    assert.throws(() => WireForm.read({ text: "a", other: 1 }, "Model", ["text"]), new JsonException(unknownField, "Model.other"));
  });

  it("refuses a field the model doesn't have even when its value is undefined, which JSON drops", () => {
    assert.throws(() => WireForm.read({ text: "a", other: undefined }, "Model", ["text"]), new JsonException(unknownField, "Model.other"));
  });

  it("reads an array of any items, and refuses another value or a missing field", () => {
    const reader = WireForm.read({ list: [1, "a", null], text: "a" }, "Model", ["list", "text"]);

    assert.deepEqual(WireForm.readArray(reader, "list"), [1, "a", null]);
    assert.throws(() => WireForm.readArray(reader, "text"), new JsonException("Expected an array.", "Model.text"));
    assert.throws(() => WireForm.readArray(reader, "none"), new JsonException("The field is required.", "Model.none"));
  });

  it("reads a number or null, and refuses another value", () => {
    const reader = WireForm.read({ number: 2, empty: null, text: "a" }, "Model", ["number", "empty", "text"]);

    assert.equal(WireForm.readNullableNumber(reader, "number"), 2);
    assert.equal(WireForm.readNullableNumber(reader, "empty"), null);
    assert.throws(() => WireForm.readNullableNumber(reader, "text"), new JsonException("Expected a number.", "Model.text"));
  });

  it("reads a list of strings or null, and refuses another value or another item", () => {
    const reader = WireForm.read({ list: ["a"], empty: null, text: "a", mixed: ["a", 1] }, "Model", ["list", "empty", "text", "mixed"]);

    assert.deepEqual(WireForm.readNullableStringArray(reader, "list"), ["a"]);
    assert.equal(WireForm.readNullableStringArray(reader, "empty"), null);
    assert.throws(() => WireForm.readNullableStringArray(reader, "text"), new JsonException("Expected an array.", "Model.text"));
    assert.throws(() => WireForm.readNullableStringArray(reader, "mixed"), new JsonException("Expected a string.", "Model.mixed.1"));
  });
});
