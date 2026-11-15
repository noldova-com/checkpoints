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
  FieldNotABooleanException, FieldNotAListException, FieldNotANumberException, FieldNotANumberOrNullException, FieldNotAStringException, FieldNotAStringListException,
  FieldNotAStringOrNullException, JsonObjectReader, MissingFieldException, NotAnObjectException, UnknownFieldException
} from "@noldova/checkpoints.protocol";

describe("JsonObjectReader", { concurrency: true }, () => {
  it("refuses a value that isn't a JSON object", () => {
    assert.throws(() => new JsonObjectReader(null, "Model"), new NotAnObjectException("Model"));
    assert.throws(() => new JsonObjectReader([], "Model"), new NotAnObjectException("Model"));
    assert.throws(() => new JsonObjectReader("text", "Model"), new NotAnObjectException("Model"));
  });

  it("reads each field as its kind", () => {
    const reader = new JsonObjectReader({ text: "a", empty: null, list: [1], any: 2, flag: false }, "Model");

    assert.equal(reader.readBoolean("flag"), false);
    assert.equal(reader.readNumber("any"), 2);
    assert.equal(reader.readNumberOrNull("any"), 2);
    assert.equal(reader.readNumberOrNull("empty"), null);
    assert.equal(reader.readString("text"), "a");
    assert.equal(reader.readStringOrNull("text"), "a");
    assert.equal(reader.readStringOrNull("empty"), null);
    assert.deepEqual(reader.readList("list"), [1]);
    assert.equal(reader.read("any"), 2);
  });

  it("reads a list of text, and refuses null, a missing field or anything else", () => {
    const reader = new JsonObjectReader({ names: ["a", "b"], empty: null, none: [], mixed: ["a", 1], text: "a" }, "Model");

    assert.deepEqual(reader.readStringList("names"), ["a", "b"]);
    assert.deepEqual(reader.readStringList("none"), []);
    assert.throws(() => reader.readStringList("empty"), new FieldNotAStringListException("Model", "empty"));
    assert.throws(() => reader.readStringList("missing"), new MissingFieldException("Model", "missing"));
    assert.throws(() => reader.readStringList("mixed"), new FieldNotAStringListException("Model", "mixed"));
    assert.throws(() => reader.readStringList("text"), new FieldNotAStringListException("Model", "text"));
  });

  it("reads a list of text or null, and refuses a missing field or anything else", () => {
    const reader = new JsonObjectReader({ names: ["a", "b"], empty: null, none: [], mixed: ["a", 1], text: "a" }, "Model");

    assert.deepEqual(reader.readStringListOrNull("names"), ["a", "b"]);
    assert.deepEqual(reader.readStringListOrNull("none"), []);
    assert.equal(reader.readStringListOrNull("empty"), null);
    assert.throws(() => reader.readStringListOrNull("missing"), new MissingFieldException("Model", "missing"));
    assert.throws(() => reader.readStringListOrNull("mixed"), new FieldNotAStringListException("Model", "mixed"));
    assert.throws(() => reader.readStringListOrNull("text"), new FieldNotAStringListException("Model", "text"));
  });

  it("refuses a missing field for every kind it reads, null or not", () => {
    const reader = new JsonObjectReader({}, "Model");
    const reads = [
      () => reader.readBoolean("a"), () => reader.readList("a"), () => reader.readNumber("a"), () => reader.readNumberOrNull("a"), () => reader.readString("a"),
      () => reader.readStringOrNull("a")
    ];

    for (const read of reads)
      assert.throws(read, new MissingFieldException("Model", "a"));
  });

  it("names the model and the field it can't read", () => {
    const reader = new JsonObjectReader({ number: 1, text: "1" }, "Model");

    assert.throws(() => reader.read("missing"), new MissingFieldException("Model", "missing"));
    assert.throws(() => reader.readBoolean("number"), new FieldNotABooleanException("Model", "number"));
    assert.throws(() => reader.readNumber("text"), new FieldNotANumberException("Model", "text"));
    assert.throws(() => reader.readNumberOrNull("text"), new FieldNotANumberOrNullException("Model", "text"));
    assert.throws(() => reader.readString("number"), new FieldNotAStringException("Model", "number"));
    assert.throws(() => reader.readStringOrNull("number"), new FieldNotAStringOrNullException("Model", "number"));
    assert.throws(() => reader.readList("number"), new FieldNotAListException("Model", "number"));
  });

  it("refuses a field the model doesn't know, and accepts the known ones", () => {
    const reader = new JsonObjectReader({ known: 1, other: 2 }, "Model");

    assert.throws(() => reader.refuseOtherFields(["known"]), new UnknownFieldException("Model", "other"));
    assert.doesNotThrow(() => reader.refuseOtherFields(["known", "other"]));
  });
});
