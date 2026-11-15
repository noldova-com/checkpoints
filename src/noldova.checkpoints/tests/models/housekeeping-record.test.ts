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
    const unreadable = (cause: Error) => (error: unknown): boolean => error instanceof StoreFileUnreadableException && error.file === "housekeeping.json"
      && error.cause instanceof Error && error.cause.constructor === cause.constructor && error.cause.message === cause.message;
    assert.throws(() => read(JSON.stringify({ formatVersion: 2, fullPass: 0 })), unreadable(new UnsupportedStoreFormatException("2")));
    assert.throws(() => read(JSON.stringify({ formatVersion: 1 })), unreadable(new JsonException("The field is required.", "HousekeepingRecord.fullPass")));
    assert.throws(() => read(JSON.stringify({ formatVersion: 1, fullPass: "0" })), unreadable(new JsonException("Expected a number.", "HousekeepingRecord.fullPass")));
    assert.throws(() => read(JSON.stringify({ formatVersion: 1, fullPass: 0, lightPass: 0 })),
      unreadable(new JsonException("The field is not part of this record, which accepts no unknown fields.", "HousekeepingRecord.lightPass")));
  });
});
