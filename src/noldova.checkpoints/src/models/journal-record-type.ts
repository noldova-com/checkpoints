/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "@noldova/context.core";

import { UnknownJournalRecordException } from "../exceptions/unknown-journal-record.exception.ts";
import { Resources } from "../resources.ts";

export class JournalRecordType {
  public static readonly Applying: JournalRecordType = new JournalRecordType(Resources.applyingRecord);
  public static readonly Aside: JournalRecordType = new JournalRecordType(Resources.asideRecord);
  public static readonly Begin: JournalRecordType = new JournalRecordType(Resources.beginRecord);
  public static readonly Cleaning: JournalRecordType = new JournalRecordType(Resources.cleaningRecord);
  public static readonly Created: JournalRecordType = new JournalRecordType(Resources.createdRecord);
  public static readonly Keeping: JournalRecordType = new JournalRecordType(Resources.keepingRecord);
  public static readonly Made: JournalRecordType = new JournalRecordType(Resources.madeRecord);
  public static readonly Placed: JournalRecordType = new JournalRecordType(Resources.placedRecord);
  public static readonly Placing: JournalRecordType = new JournalRecordType(Resources.placingRecord);
  public static readonly Removing: JournalRecordType = new JournalRecordType(Resources.removingRecord);
  public static readonly Renamed: JournalRecordType = new JournalRecordType(Resources.renamedRecord);
  public static readonly Returned: JournalRecordType = new JournalRecordType(Resources.returnedRecord);
  public static readonly RollingBack: JournalRecordType = new JournalRecordType(Resources.rollingBackRecord);

  private static readonly ALL: readonly JournalRecordType[] = [
    JournalRecordType.Applying, JournalRecordType.Aside, JournalRecordType.Begin, JournalRecordType.Cleaning, JournalRecordType.Created,
    JournalRecordType.Keeping, JournalRecordType.Made, JournalRecordType.Placed, JournalRecordType.Placing, JournalRecordType.Removing,
    JournalRecordType.Renamed, JournalRecordType.Returned, JournalRecordType.RollingBack
  ];

  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static fromJson(value: string): JournalRecordType {
    const type = JournalRecordType.ALL.find(t => t.value === value);
    if (Object.isUndefined(type))
      throw new UnknownJournalRecordException(value);
    return type;
  }

  public toJson(): string {
    return this.value;
  }
}
