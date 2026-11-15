/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JournalRecord } from "./journal-record.ts";
import type { RestoreScript } from "./restore-script.ts";

export class JournalReading {
  public readonly isReadable: boolean;
  public readonly records: readonly JournalRecord[];

  public constructor(records: readonly JournalRecord[], isReadable: boolean) {
    this.isReadable = isReadable;
    this.records = [...records];
  }

  public get script(): RestoreScript | null {
    return this.isReadable ? this.records[0]?.script ?? null : null;
  }
}
