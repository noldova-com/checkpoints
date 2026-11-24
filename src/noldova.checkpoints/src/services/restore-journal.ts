/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createHash } from "node:crypto";
import { open, readFile, rename, rm, type FileHandle } from "node:fs/promises";
import path from "node:path";

import { ProtocolException } from "@noldova/checkpoints.protocol";
import { JsonException, JsonReader } from "@noldova/context.json";

import { StoreException } from "../exceptions/store.exception.ts";
import { JournalReading } from "../models/journal-reading.ts";
import { JournalRecord } from "../models/journal-record.ts";
import type { RestoreScript } from "../models/restore-script.ts";
import { Resources } from "../resources.ts";
import { Failures } from "./failures.ts";
import { FolderSync } from "./folder-sync.ts";

export class RestoreJournal {
  private static readonly FOLDERS: FolderSync = new FolderSync(process.platform);
  private readonly written: JournalRecord[] = [];

  public readonly file: string;

  public constructor(file: string) {
    this.file = file;
  }

  public get records(): readonly JournalRecord[] {
    return this.written;
  }

  public async appendAsync(record: JournalRecord): Promise<void> {
    const handle = await open(this.file, Resources.appendFlag);
    try {
      const { size } = await handle.stat();
      try {
        await RestoreJournal.writeWholeAsync(handle, RestoreJournal.lineOf(record));
        await handle.sync();
      }
      catch (error) {
        await RestoreJournal.truncateAsync(this.file, size);
        throw error;
      }
    }
    finally {
      await handle.close();
    }
    this.written.push(record);
  }

  public async createAsync(script: RestoreScript): Promise<void> {
    const temporary = `${this.file}${Resources.temporarySuffix}`;
    const begin = JournalRecord.begin(script);
    const handle = await open(temporary, Resources.writeFlag);
    try {
      await RestoreJournal.writeWholeAsync(handle, RestoreJournal.lineOf(begin));
      await handle.sync();
    }
    finally {
      await handle.close();
    }
    await rename(temporary, this.file);
    await RestoreJournal.syncFolderAsync(path.dirname(this.file));
    this.written.splice(0, this.written.length, begin);
  }

  public async readAsync(): Promise<JournalReading | null> {
    const bytes = await readFile(this.file).catch((t: unknown) => {
      if (Failures.codeOf(t) === Resources.missingCode)
        return null;
      throw t;
    });
    if (bytes === null)
      return null;

    const lines = bytes.toString(Resources.utf8Encoding).split(Resources.lineFeed).slice(0, -1);
    const records: JournalRecord[] = [];
    let whole = 0;
    for (const line of lines) {
      if (!RestoreJournal.isWhole(line)) {
        if (records.length === 0 || records.length + 1 < lines.length)
          return this.unreadable();
        break;
      }
      const record = RestoreJournal.parse(line);
      if (record === null)
        return this.unreadable();
      records.push(record);
      whole += Buffer.byteLength(line) + 1;
    }
    if (whole < bytes.length)
      await RestoreJournal.truncateAsync(this.file, whole);
    this.written.splice(0, this.written.length, ...records);
    return new JournalReading(records, true);
  }

  public async removeAsync(): Promise<void> {
    await rm(this.file, { force: true });
    await rm(`${this.file}${Resources.temporarySuffix}`, { force: true });
  }

  public static async syncFolderAsync(folder: string): Promise<void> {
    await RestoreJournal.FOLDERS.syncAsync(folder);
  }

  private static async writeWholeAsync(handle: FileHandle, text: string): Promise<void> {
    const bytes = Buffer.from(text, Resources.utf8Encoding);
    for (let written = 0; written < bytes.length;)
      written += (await handle.write(bytes, written)).bytesWritten;
  }

  private static lineOf(record: JournalRecord): string {
    const json = JSON.stringify(record.toJson());
    return `${JSON.stringify({ [Resources.recordField]: record.toJson(), [Resources.sumField]: RestoreJournal.sumOf(json) })}${Resources.lineFeed}`;
  }

  private static isWhole(line: string): boolean {
    return Failures.recover(() => {
      const value = JsonReader.fromValue(JSON.parse(line), Resources.journalLineModel);
      return RestoreJournal.sumOf(JSON.stringify(value.readValue(Resources.recordField))) === value.readValue(Resources.sumField);
    }, t => t instanceof JsonException || t instanceof SyntaxError, false);
  }

  private static parse(line: string): JournalRecord | null {
    return Failures.recover(() => JournalRecord.fromJson(JsonReader.fromValue(JSON.parse(line), Resources.journalLineModel).readValue(Resources.recordField)),
      t => t instanceof StoreException || t instanceof ProtocolException || t instanceof JsonException, null);
  }

  private static sumOf(json: string): string {
    return createHash(Resources.sumAlgorithm).update(json).digest(Resources.hexEncoding);
  }

  private unreadable(): JournalReading {
    this.written.splice(0, this.written.length);
    return new JournalReading([], false);
  }

  private static async truncateAsync(file: string, length: number): Promise<void> {
    const handle = await open(file, Resources.readWriteFlag);
    try {
      await handle.truncate(length);
      await handle.sync();
    }
    finally {
      await handle.close();
    }
  }
}
