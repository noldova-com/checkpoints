/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { JsonObjectReader, type JsonObject } from "@noldova/checkpoints.protocol";

import { Resources } from "../resources.ts";
import { EntryKind } from "./entry-kind.ts";
import type { WalkedEntry } from "./walked-entry.ts";

export class IndexEntry {
  private static readonly FIELDS: readonly string[] = [
    Resources.pathField, Resources.kindField, Resources.sizeField, Resources.modifiedField, Resources.changedField, Resources.fileIdField,
    Resources.objectIdField
  ];

  public readonly changed: bigint;
  public readonly fileId: string;
  public readonly kind: EntryKind;
  public readonly modified: bigint;
  public readonly objectId: string;
  public readonly path: string;
  public readonly size: number;

  public constructor(path: string, kind: EntryKind, size: number, modified: bigint, changed: bigint, fileId: string, objectId: string) {
    this.changed = changed;
    this.fileId = fileId;
    this.kind = kind;
    this.modified = modified;
    this.objectId = objectId;
    this.path = path;
    this.size = size;
  }

  public static fromJson(value: unknown): IndexEntry {
    const reader = new JsonObjectReader(value, Resources.indexEntryModel);
    reader.refuseOtherFields(IndexEntry.FIELDS);
    return new IndexEntry(
      reader.readString(Resources.pathField),
      EntryKind.fromJson(reader.read(Resources.kindField)),
      Number(BigInt(reader.readString(Resources.sizeField))),
      BigInt(reader.readString(Resources.modifiedField)),
      BigInt(reader.readString(Resources.changedField)),
      reader.readString(Resources.fileIdField),
      reader.readString(Resources.objectIdField));
  }

  public static of(entry: WalkedEntry, objectId: string): IndexEntry {
    return new IndexEntry(entry.path, entry.kind, entry.size, entry.modified, entry.changed, entry.fileId, objectId);
  }

  public matches(entry: WalkedEntry, racyFrom: bigint): boolean {
    return entry.kind === this.kind && entry.size === this.size && entry.modified === this.modified && entry.changed === this.changed &&
      entry.fileId === this.fileId && this.modified < racyFrom && this.changed < racyFrom;
  }

  public toJson(): JsonObject {
    return {
      [Resources.pathField]: this.path,
      [Resources.kindField]: this.kind.toJson(),
      [Resources.sizeField]: String(this.size),
      [Resources.modifiedField]: String(this.modified),
      [Resources.changedField]: String(this.changed),
      [Resources.fileIdField]: this.fileId,
      [Resources.objectIdField]: this.objectId
    };
  }
}
