/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FieldNotANumberException, MissingFieldException, UnknownFieldException } from "@noldova/checkpoints.protocol";

import { StoreFileUnreadableException, UnsupportedStoreFormatException } from "../../src/api/index.ts";
import { HousekeepingRecord } from "../../src/models/housekeeping-record.ts";
import { StoreFile } from "../../src/services/store-file.ts";

describe("HousekeepingRecord", { concurrency: true }, () => {
  const read = (text: string): HousekeepingRecord => StoreFile.parse("housekeeping.json", text, t => HousekeepingRecord.fromJson(t));

  it("writes and reads when the store's last full pass ended, with its format version", () => {
    const json = new HousekeepingRecord(1_760_000_000_000).toJson();

    assert.deepEqual(json, { formatVersion: 1, fullPass: 1_760_000_000_000 });
    assert.equal(HousekeepingRecord.fromJson(json).fullPass, 1_760_000_000_000);
  });

  it("refuses a record of a format version it doesn't read, one without its time, and one with a field it doesn't know", () => {
    const unreadable = (cause: new (...args: never[]) => Error) => (error: unknown): boolean =>
      error instanceof StoreFileUnreadableException && error.file === "housekeeping.json" && error.cause instanceof cause;
    assert.throws(() => read(JSON.stringify({ formatVersion: 2, fullPass: 0 })), unreadable(UnsupportedStoreFormatException));
    assert.throws(() => read(JSON.stringify({ formatVersion: 1 })), unreadable(MissingFieldException));
    assert.throws(() => read(JSON.stringify({ formatVersion: 1, fullPass: "0" })), unreadable(FieldNotANumberException));
    assert.throws(() => read(JSON.stringify({ formatVersion: 1, fullPass: 0, lightPass: 0 })), unreadable(UnknownFieldException));
  });
});
