/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "@noldova/context.core";
import { CaptureMode, Checkpoint, UnreadPath, UnreadReason } from "@noldova/checkpoints.protocol";
import type { JsonObject } from "@noldova/context.json";

import { IgnoreRulesMismatchException } from "../exceptions/ignore-rules-mismatch.exception.ts";
import { Resources } from "../resources.ts";
import { StoreFormat } from "../services/store-format.ts";
import { IgnoreRecord } from "./ignore-record.ts";
import type { LinkKind } from "./link-kind.ts";
import { LinkRecord } from "./link-record.ts";

export class CheckpointRecord {
  private static readonly FIELDS: readonly string[] = [
    Resources.formatVersionField, Resources.checkpointField, Resources.emptyFoldersField, Resources.linksField, Resources.ignoreRulesField,
    Resources.earlierPathsField
  ];
  private static readonly VERSION_2_FIELDS: readonly string[] = CheckpointRecord.FIELDS.filter(t => t !== Resources.earlierPathsField);
  private static readonly VERSION_1_CHECKPOINT_FIELDS: readonly string[] = [
    Resources.idField, Resources.timeField, Resources.modeField, Resources.labelField, Resources.unreadPathsField
  ];
  private static readonly VERSION_1_UNREAD_PATH_FIELDS: readonly string[] = [Resources.pathField, Resources.reasonField];

  public readonly checkpoint: Checkpoint;
  public readonly earlierPaths: readonly string[];
  public readonly emptyFolders: readonly string[];
  public readonly ignoreRules: IgnoreRecord | null;
  public readonly links: readonly LinkRecord[];

  public constructor(
    checkpoint: Checkpoint, emptyFolders: readonly string[], links: readonly LinkRecord[], ignoreRules: IgnoreRecord | null,
    earlierPaths: readonly string[] = []) {
    if ((checkpoint.mode === CaptureMode.IgnoreFiles) !== (!Object.isNull(ignoreRules)))
      throw new IgnoreRulesMismatchException(checkpoint.mode);

    this.checkpoint = checkpoint;
    this.earlierPaths = [...earlierPaths];
    this.emptyFolders = [...emptyFolders];
    this.ignoreRules = ignoreRules;
    this.links = [...links];
  }

  public static fromJson(value: unknown): CheckpointRecord {
    const version = StoreFormat.readVersion(StoreFormat.read(value, Resources.checkpointRecordModel, CheckpointRecord.FIELDS),
      [Resources.formatVersion, Resources.version2CheckpointFormat, Resources.checkpointFormatVersion]);
    const reader = StoreFormat.read(value, Resources.checkpointRecordModel,
      version === Resources.checkpointFormatVersion ? CheckpointRecord.FIELDS : CheckpointRecord.VERSION_2_FIELDS);
    const written = reader.readValue(Resources.checkpointField);
    const checkpoint = version === Resources.formatVersion ? CheckpointRecord.checkpointOfVersion1(written) : Checkpoint.fromJson(written);
    const emptyFolders = reader.readStringArray(Resources.emptyFoldersField);
    const links = StoreFormat.readArray(reader, Resources.linksField).map(t => LinkRecord.fromJson(t));
    const ignoreRules = reader.readValue(Resources.ignoreRulesField);
    const earlierPaths = version === Resources.checkpointFormatVersion ? reader.readStringArray(Resources.earlierPathsField) : [];
    return new CheckpointRecord(checkpoint, emptyFolders, links, Object.isNull(ignoreRules) ? null : IgnoreRecord.fromJson(ignoreRules), earlierPaths);
  }

  public linkKindOf(relativePath: string): LinkKind | null {
    return this.links.find(t => t.path === relativePath)?.linkKind ?? null;
  }

  public toJson(): JsonObject {
    return {
      [Resources.formatVersionField]: Resources.checkpointFormatVersion,
      [Resources.checkpointField]: this.checkpoint.toJson(),
      [Resources.emptyFoldersField]: [...this.emptyFolders],
      [Resources.linksField]: this.links.map(t => t.toJson()),
      [Resources.ignoreRulesField]: Object.isNull(this.ignoreRules) ? null : this.ignoreRules.toJson(),
      [Resources.earlierPathsField]: [...this.earlierPaths]
    };
  }

  private static checkpointOfVersion1(value: unknown): Checkpoint {
    const reader = StoreFormat.read(value, Resources.checkpointModel, CheckpointRecord.VERSION_1_CHECKPOINT_FIELDS);
    const read = Checkpoint.fromJson({
      [Resources.idField]: reader.readValue(Resources.idField),
      [Resources.timeField]: reader.readValue(Resources.timeField),
      [Resources.modeField]: reader.readValue(Resources.modeField),
      [Resources.labelField]: reader.readValue(Resources.labelField),
      [Resources.unreadPathsField]: []
    });
    const unreadPaths = StoreFormat.readArray(reader, Resources.unreadPathsField).map(t => CheckpointRecord.unreadPathOfVersion1(t));
    return new Checkpoint(read.id, read.time, read.mode, read.label, unreadPaths);
  }

  private static unreadPathOfVersion1(value: unknown): UnreadPath {
    const reader = StoreFormat.read(value, Resources.unreadPathModel, CheckpointRecord.VERSION_1_UNREAD_PATH_FIELDS);
    return new UnreadPath(reader.readString(Resources.pathField), UnreadReason.fromJson(reader.readValue(Resources.reasonField)), null);
  }
}
