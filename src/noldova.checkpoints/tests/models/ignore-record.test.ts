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

import { IgnoreRecord } from "../../src/models/ignore-record.ts";

describe("IgnoreRecord", { concurrency: true }, () => {
  it("writes whether letter case was ignored and the nested repositories' folders, and reads them back", () => {
    const record = new IgnoreRecord(true, ["vendor/lib"]);
    const read = IgnoreRecord.fromJson(record.toJson());

    assert.deepEqual(record.toJson(), { ignoresCase: true, repositoryFolders: ["vendor/lib"] });
    assert.deepEqual([read.ignoresCase, read.repositoryFolders], [true, ["vendor/lib"]]);
  });

  it("refuses a record whose ignoresCase isn't true or false", () => {
    assert.throws(() => IgnoreRecord.fromJson({ ignoresCase: "yes", repositoryFolders: [] }),
      new JsonException("Expected a boolean.", "IgnoreRecord.ignoresCase"));
  });

  it("refuses a record whose repositories' folders aren't all text, or that holds another field", () => {
    assert.throws(() => IgnoreRecord.fromJson({ ignoresCase: false, repositoryFolders: [1] }), new JsonException("Expected a string.", "IgnoreRecord.repositoryFolders.0"));
    assert.throws(() => IgnoreRecord.fromJson({ ignoresCase: false, repositoryFolders: [], other: 1 }), new JsonException("The field is not part of this message, which accepts no unknown fields.", "IgnoreRecord.other"));
  });
});
