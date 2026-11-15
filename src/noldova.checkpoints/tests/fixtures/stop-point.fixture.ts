/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/context.json";

import { JournalRecordType } from "../../src/models/journal-record-type.ts";
import type { JournalRecord } from "../../src/models/journal-record.ts";
import { JsonFixture, type JsonFields } from "./json.fixture.ts";

export class StopPoint {
  public static readonly Never: StopPoint = new StopPoint(Number.POSITIVE_INFINITY, false, null, false);

  public readonly afterRecord: boolean;
  public readonly afterType: JournalRecordType | null;
  public readonly at: number;
  public readonly onRemove: boolean;

  private constructor(at: number, afterRecord: boolean, afterType: JournalRecordType | null, onRemove: boolean) {
    this.afterRecord = afterRecord;
    this.afterType = afterType;
    this.at = at;
    this.onRemove = onRemove;
  }

  public static before(record: number): StopPoint {
    return new StopPoint(record, false, null, false);
  }

  public static after(record: number): StopPoint {
    return new StopPoint(record, true, null, false);
  }

  public static afterFirst(type: JournalRecordType): StopPoint {
    return new StopPoint(Number.POSITIVE_INFINITY, false, type, false);
  }

  public static atRemoval(): StopPoint {
    return new StopPoint(Number.POSITIVE_INFINITY, false, null, true);
  }

  public static fromJson(fields: JsonFields): StopPoint {
    const at = fields["at"] === null ? Number.POSITIVE_INFINITY : JsonFixture.numberOf(fields["at"]);
    const afterType = fields["afterType"] === null ? null : JournalRecordType.fromJson(JsonFixture.textOf(fields["afterType"]));
    return new StopPoint(at, JsonFixture.booleanOf(fields["afterRecord"]), afterType, JsonFixture.booleanOf(fields["onRemove"]));
  }

  public isBefore(written: number): boolean {
    return !this.afterRecord && written >= this.at;
  }

  public isAfter(written: number, record: JournalRecord): boolean {
    return (this.afterRecord && written > this.at) || record.type === this.afterType;
  }

  public toJson(): JsonObject {
    return {
      at: Number.isFinite(this.at) ? this.at : null,
      afterRecord: this.afterRecord,
      afterType: this.afterType === null ? null : this.afterType.toJson(),
      onRemove: this.onRemove
    };
  }
}
