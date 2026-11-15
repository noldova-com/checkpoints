/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JournalRecord } from "../../src/models/journal-record.ts";
import { RestoreJournal } from "../../src/services/restore-journal.ts";
import { StopPoint } from "./stop-point.fixture.ts";

export class ScriptedJournal extends RestoreJournal {
  public static readonly stoppedLine: string = "stopped";

  private readonly afterAsync: (record: JournalRecord) => Promise<void>;
  private readonly stop: StopPoint;

  public readonly appended: JournalRecord[] = [];

  public constructor(file: string, after: (record: JournalRecord) => Promise<void> = async () => undefined, stop: StopPoint = StopPoint.Never) {
    super(file);
    this.afterAsync = after;
    this.stop = stop;
  }

  public override async appendAsync(record: JournalRecord): Promise<void> {
    if (this.stop.isBefore(this.appended.length))
      await ScriptedJournal.stopAsync();
    await super.appendAsync(record);
    this.appended.push(record);
    await this.afterAsync(record);
    if (this.stop.isAfter(this.appended.length, record))
      await ScriptedJournal.stopAsync();
  }

  public override async removeAsync(): Promise<void> {
    if (this.stop.onRemove)
      await ScriptedJournal.stopAsync();
    await super.removeAsync();
  }

  private static async stopAsync(): Promise<void> {
    process.stdin.resume();
    process.stdout.write(`${ScriptedJournal.stoppedLine}\n`);
    await new Promise<void>(() => undefined);
  }
}
