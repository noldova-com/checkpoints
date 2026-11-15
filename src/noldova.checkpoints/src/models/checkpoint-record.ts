/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { CaptureMode, Checkpoint, JsonObjectReader, UnreadPath, UnreadReason, type JsonObject } from "@noldova/checkpoints.protocol";

import { IgnoreRulesMismatchException } from "../exceptions/ignore-rules-mismatch.exception.ts";
import { Resources } from "../resources.ts";
import { StoreFormat } from "../services/store-format.ts";
import { IgnoreRecord } from "./ignore-record.ts";
import type { LinkKind } from "./link-kind.ts";
import { LinkRecord } from "./link-record.ts";

export class CheckpointRecord {
  private static readonly FIELDS: readonly string[] = [
    Resources.formatVersionField, Resources.checkpointField, Resources.emptyFoldersField, Resources.linksField, Resources.ignoreRulesField
  ];
  private static readonly VERSION_1_CHECKPOINT_FIELDS: readonly string[] = [
    Resources.idField, Resources.timeField, Resources.modeField, Resources.labelField, Resources.unreadPathsField
  ];
  private static readonly VERSION_1_UNREAD_PATH_FIELDS: readonly string[] = [Resources.pathField, Resources.reasonField];

  public readonly checkpoint: Checkpoint;
  public readonly emptyFolders: readonly string[];
  public readonly ignoreRules: IgnoreRecord | null;
  public readonly links: readonly LinkRecord[];

  public constructor(checkpoint: Checkpoint, emptyFolders: readonly string[], links: readonly LinkRecord[], ignoreRules: IgnoreRecord | null) {
    if ((checkpoint.mode === CaptureMode.IgnoreFiles) !== (ignoreRules !== null))
      throw new IgnoreRulesMismatchException(checkpoint.mode);

    this.checkpoint = checkpoint;
    this.emptyFolders = [...emptyFolders];
    this.ignoreRules = ignoreRules;
    this.links = [...links];
  }

  public static fromJson(value: unknown): CheckpointRecord {
    const reader = new JsonObjectReader(value, Resources.checkpointRecordModel);
    reader.refuseOtherFields(CheckpointRecord.FIELDS);
    const version = StoreFormat.readVersion(reader, [Resources.formatVersion, Resources.checkpointFormatVersion]);
    const written = reader.read(Resources.checkpointField);
    const checkpoint = version === Resources.formatVersion ? CheckpointRecord.checkpointOfVersion1(written) : Checkpoint.fromJson(written);
    const emptyFolders = StoreFormat.readStringList(reader, Resources.emptyFoldersField);
    const links = reader.readList(Resources.linksField).map(t => LinkRecord.fromJson(t));
    const ignoreRules = reader.read(Resources.ignoreRulesField);
    return new CheckpointRecord(checkpoint, emptyFolders, links, ignoreRules === null ? null : IgnoreRecord.fromJson(ignoreRules));
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
      [Resources.ignoreRulesField]: this.ignoreRules === null ? null : this.ignoreRules.toJson()
    };
  }

  private static checkpointOfVersion1(value: unknown): Checkpoint {
    const reader = new JsonObjectReader(value, Resources.checkpointModel);
    reader.refuseOtherFields(CheckpointRecord.VERSION_1_CHECKPOINT_FIELDS);
    const read = Checkpoint.fromJson({
      [Resources.idField]: reader.read(Resources.idField),
      [Resources.timeField]: reader.read(Resources.timeField),
      [Resources.modeField]: reader.read(Resources.modeField),
      [Resources.labelField]: reader.read(Resources.labelField),
      [Resources.unreadPathsField]: []
    });
    const unreadPaths = reader.readList(Resources.unreadPathsField).map(t => CheckpointRecord.unreadPathOfVersion1(t));
    return new Checkpoint(read.id, read.time, read.mode, read.label, unreadPaths);
  }

  private static unreadPathOfVersion1(value: unknown): UnreadPath {
    const reader = new JsonObjectReader(value, Resources.unreadPathModel);
    reader.refuseOtherFields(CheckpointRecord.VERSION_1_UNREAD_PATH_FIELDS);
    return new UnreadPath(reader.readString(Resources.pathField), UnreadReason.fromJson(reader.read(Resources.reasonField)), null);
  }
}
