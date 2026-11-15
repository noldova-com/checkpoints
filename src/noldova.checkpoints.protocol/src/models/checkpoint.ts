/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { InvalidDateException } from "../exceptions/invalid-date.exception.ts";
import { InvalidTimeException } from "../exceptions/invalid-time.exception.ts";
import { LabelTooLongException } from "../exceptions/label-too-long.exception.ts";
import { Resources } from "../resources.ts";
import { CheckpointId } from "../services/checkpoint-id.ts";
import { JsonObjectReader } from "../services/json-object.reader.ts";
import type { JsonObject } from "../types/json-object.ts";
import { CaptureMode } from "./capture-mode.ts";
import { UnreadPath } from "./unread-path.ts";

export class Checkpoint {
  private static readonly FIELDS: readonly string[] = [
    Resources.idField, Resources.timeField, Resources.modeField, Resources.labelField, Resources.unreadPathsField
  ];
  public readonly id: string;
  public readonly label: string | null;
  public readonly mode: CaptureMode;
  public readonly time: Date;
  public readonly unreadPaths: readonly UnreadPath[];

  public constructor(id: string, time: Date, mode: CaptureMode, label: string | null, unreadPaths: readonly UnreadPath[]) {
    CheckpointId.check(id);
    if (label !== null && label.length > Resources.maximumLabelLength)
      throw new LabelTooLongException(label.length);
    if (Number.isNaN(time.getTime()))
      throw new InvalidDateException();

    this.id = id;
    this.label = label;
    this.mode = mode;
    this.time = new Date(time.getTime());
    this.unreadPaths = [...unreadPaths];
  }

  public static fromJson(value: unknown): Checkpoint {
    const reader = new JsonObjectReader(value, Resources.checkpointModel);
    reader.refuseOtherFields(Checkpoint.FIELDS);
    const time = reader.readString(Resources.timeField);
    if (!Resources.timePattern.test(time) || Number.isNaN(Date.parse(time)) || new Date(time).toISOString() !== time)
      throw new InvalidTimeException(time);
    return new Checkpoint(
      reader.readString(Resources.idField),
      new Date(time),
      CaptureMode.fromJson(reader.read(Resources.modeField)),
      reader.readStringOrNull(Resources.labelField),
      reader.readList(Resources.unreadPathsField).map(t => UnreadPath.fromJson(t)));
  }

  public toJson(): JsonObject {
    return {
      [Resources.idField]: this.id,
      [Resources.timeField]: this.time.toISOString(),
      [Resources.modeField]: this.mode.toJson(),
      [Resources.labelField]: this.label,
      [Resources.unreadPathsField]: this.unreadPaths.map(t => t.toJson())
    };
  }
}
