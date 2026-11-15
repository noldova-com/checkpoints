/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { JsonObjectReader, type JsonObject } from "@noldova/checkpoints.protocol";

import { JournalFieldMissingException } from "../exceptions/journal-field-missing.exception.ts";
import { Resources } from "../resources.ts";
import { JournalRecordType } from "./journal-record-type.ts";
import { RestoreScript } from "./restore-script.ts";

export class JournalRecord {
  public static readonly Applying: JournalRecord = new JournalRecord(JournalRecordType.Applying, null, null, null, null, null, null);
  public static readonly Cleaning: JournalRecord = new JournalRecord(JournalRecordType.Cleaning, null, null, null, null, null, null);
  public static readonly RollingBack: JournalRecord = new JournalRecord(JournalRecordType.RollingBack, null, null, null, null, null, null);

  private static readonly FIELDS: readonly string[] = [
    Resources.typeField, Resources.scriptField, Resources.stepField, Resources.pathField, Resources.fromField, Resources.fileIdField,
    Resources.checkpointField
  ];

  public readonly checkpoint: string | null;
  public readonly fileId: string | null;
  public readonly from: string | null;
  public readonly path: string | null;
  public readonly script: RestoreScript | null;
  public readonly step: number | null;
  public readonly type: JournalRecordType;

  private constructor(
    type: JournalRecordType,
    script: RestoreScript | null,
    step: number | null,
    path: string | null,
    from: string | null,
    fileId: string | null,
    checkpoint: string | null) {
    this.checkpoint = checkpoint;
    this.fileId = fileId;
    this.from = from;
    this.path = path;
    this.script = script;
    this.step = step;
    this.type = type;
  }

  public static begin(script: RestoreScript): JournalRecord {
    return new JournalRecord(JournalRecordType.Begin, script, null, null, null, null, null);
  }

  public static keeping(checkpoint: string): JournalRecord {
    return new JournalRecord(JournalRecordType.Keeping, null, null, null, null, null, checkpoint);
  }

  public static ofStep(type: JournalRecordType, step: number): JournalRecord {
    return new JournalRecord(type, null, step, null, null, null, null);
  }

  public static ofFile(type: JournalRecordType, step: number, fileId: string): JournalRecord {
    return new JournalRecord(type, null, step, null, null, fileId, null);
  }

  public static ofPath(type: JournalRecordType, path: string): JournalRecord {
    return new JournalRecord(type, null, null, path, null, null, null);
  }

  public static renamed(path: string, from: string): JournalRecord {
    return new JournalRecord(JournalRecordType.Renamed, null, null, path, from, null, null);
  }

  public static fromJson(value: unknown): JournalRecord {
    const reader = new JsonObjectReader(value, Resources.journalRecordModel);
    reader.refuseOtherFields(JournalRecord.FIELDS);
    const type = JournalRecordType.fromJson(reader.readString(Resources.typeField));
    const script = reader.read(Resources.scriptField);
    return new JournalRecord(type, script === null ? null : RestoreScript.fromJson(script), reader.readNumberOrNull(Resources.stepField),
      reader.readStringOrNull(Resources.pathField), reader.readStringOrNull(Resources.fromField), reader.readStringOrNull(Resources.fileIdField),
      reader.readStringOrNull(Resources.checkpointField));
  }

  public isSameAs(other: JournalRecord): boolean {
    return this.type === other.type && this.step === other.step && this.path === other.path;
  }

  public readCheckpoint(): string {
    return JournalRecord.required(this.checkpoint, Resources.checkpointField);
  }

  public readFrom(): string {
    return JournalRecord.required(this.from, Resources.fromField);
  }

  public readPath(): string {
    return JournalRecord.required(this.path, Resources.pathField);
  }

  public readStep(): number {
    return JournalRecord.required(this.step, Resources.stepField);
  }

  public toJson(): JsonObject {
    return {
      [Resources.typeField]: this.type.toJson(),
      [Resources.scriptField]: this.script === null ? null : this.script.toJson(),
      [Resources.stepField]: this.step,
      [Resources.pathField]: this.path,
      [Resources.fromField]: this.from,
      [Resources.fileIdField]: this.fileId,
      [Resources.checkpointField]: this.checkpoint
    };
  }

  private static required<T>(value: T | null, field: string): T {
    if (value === null)
      throw new JournalFieldMissingException(Resources.journalRecordModel, field);
    return value;
  }
}
