/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { access, open, readdir, readFile, rm, utimes, writeFile } from "node:fs/promises";
import path from "node:path";

import { JournalRecordType } from "../../src/models/journal-record-type.ts";
import type { JournalRecord } from "../../src/models/journal-record.ts";
import { RestoreJournal } from "../../src/services/restore-journal.ts";
import type { CheckpointsHarness } from "./checkpoints-harness.fixture.ts";
import { FailureFixture } from "./failure.fixture.ts";
import { JsonFixture } from "./json.fixture.ts";
import { ScriptView } from "./script-view.fixture.ts";

export class RestoreFolder {
  public static readonly time: number = 1_700_000_000;

  public readonly folder: string;
  public readonly store: string;

  public constructor(folder: string, store: string) {
    this.folder = folder;
    this.store = store;
  }

  public static of(harness: CheckpointsHarness): RestoreFolder {
    return new RestoreFolder(harness.folder, harness.store);
  }

  public static presentOf<T>(value: T | null): T {
    assert.ok(value !== null);
    return value;
  }

  public static async existsAsync(location: string): Promise<boolean> {
    return await access(location).then(() => true, (error: unknown) => {
      if (!FailureFixture.hasCode(error, "ENOENT"))
        throw error;
      return false;
    });
  }

  public async assertCleanAsync(): Promise<void> {
    assert.deepEqual((await readdir(this.folder)).filter(t => t.startsWith(".~")), []);
    assert.equal(await RestoreFolder.existsAsync(this.journalFile), false);
  }

  public async recordsAsync(): Promise<readonly JournalRecord[]> {
    return (await new RestoreJournal(this.journalFile).readAsync())?.records.filter(t => t.type !== JournalRecordType.Begin) ?? [];
  }

  public async scriptAsync(): Promise<ScriptView> {
    const [first = ""] = (await readFile(this.journalFile, "utf8")).split("\n");
    return ScriptView.fromJson(JsonFixture.objectOf(JsonFixture.objectOf(JsonFixture.parse(first)["record"])["script"]));
  }

  public locationOf(relativePath: string): string {
    return path.join(this.folder, ...relativePath.split("/"));
  }

  public async asideOfAsync(relativePath: string): Promise<string> {
    return this.locationOf(RestoreFolder.presentOf((await this.scriptAsync()).steps.find(t => t.path === relativePath)?.aside ?? null));
  }

  public async stageOfAsync(step: number): Promise<string> {
    return this.locationOf(RestoreFolder.presentOf((await this.scriptAsync()).steps[step]?.stage ?? null));
  }

  public async stagingAsync(): Promise<string> {
    return `.~${(await this.scriptAsync()).restoreId}`;
  }

  public onFirstAside(relativePath: string, changeAsync: (location: string, aside: string) => Promise<void>): (record: JournalRecord) => Promise<void> {
    let changed = false;
    return async record => {
      if (record.type !== JournalRecordType.Aside || changed)
        return;
      changed = true;
      await changeAsync(this.locationOf(relativePath), await this.asideOfAsync(relativePath));
    };
  }

  public rewritingInPlace(relativePath: string, text: string, time: number): (record: JournalRecord) => Promise<void> {
    return this.onFirstAside(relativePath, async location => {
      const handle = await open(location, "r+");
      try {
        await handle.write(text, 0, "utf8");
      }
      finally {
        await handle.close();
      }
      await utimes(location, time, time);
    });
  }

  public losingAsides(loseBeforeAsync: (before: string) => Promise<void> = async () => undefined): (record: JournalRecord) => Promise<void> {
    let lost = false;
    return async record => {
      if (record.type !== JournalRecordType.Placing || lost)
        return;
      lost = true;
      await rm(await this.asideOfAsync("i.txt"));
      await rm(await this.asideOfAsync("g"), { recursive: true });
      await rm(await this.stageOfAsync(RestoreFolder.presentOf(record.step)));
      await loseBeforeAsync((await this.scriptAsync()).before);
    };
  }

  public losingStageOnce(type: JournalRecordType): (record: JournalRecord) => Promise<void> {
    let lost = false;
    return async record => {
      if (record.type !== type || lost)
        return;
      lost = true;
      await rm(await this.stageOfAsync(RestoreFolder.presentOf(record.step)));
    };
  }

  public writingAsideOnCleaning(relativePath: string, text: string): (record: JournalRecord) => Promise<void> {
    return async record => {
      if (record.type === JournalRecordType.Cleaning)
        await writeFile(await this.asideOfAsync(relativePath), text);
    };
  }

  public actionOf(name: string): (record: JournalRecord) => Promise<void> {
    if (name === "none")
      return async () => undefined;
    if (name === "rewriteInPlace")
      return this.rewritingInPlace("f.txt", "bbbb", RestoreFolder.time);
    if (name === "loseAsides")
      return this.losingAsides();
    if (name === "loseStageOnPlaced")
      return this.losingStageOnce(JournalRecordType.Placed);
    if (name === "loseStageOnPlacing")
      return this.losingStageOnce(JournalRecordType.Placing);
    if (name === "writeAsideOnCleaning")
      return this.writingAsideOnCleaning("a.txt", "written after it was moved aside");
    throw new Error(`No record action is named ${name}.`);
  }

  private get journalFile(): string {
    return path.join(this.store, "restore.json");
  }
}
