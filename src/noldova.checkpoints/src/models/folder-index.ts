/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "@noldova/context.core";
import type { JsonObject } from "@noldova/context.json";

import { Resources } from "../resources.ts";
import { StoreFormat } from "../services/store-format.ts";
import { IndexEntry } from "./index-entry.ts";
import type { WalkedEntry } from "./walked-entry.ts";

export class FolderIndex {
  public static readonly Empty: FolderIndex = new FolderIndex(0n, []);

  private static readonly FIELDS: readonly string[] = [Resources.formatVersionField, Resources.startField, Resources.entriesField];
  private readonly byPath: ReadonlyMap<string, IndexEntry>;

  public readonly entries: readonly IndexEntry[];
  public readonly start: bigint;

  public constructor(start: bigint, entries: readonly IndexEntry[]) {
    this.byPath = new Map(entries.map(t => [t.path, t]));
    this.entries = [...entries];
    this.start = start;
  }

  public static fromJson(value: unknown): FolderIndex {
    const reader = StoreFormat.read(value, Resources.folderIndexModel, FolderIndex.FIELDS);
    StoreFormat.check(reader);
    return new FolderIndex(BigInt(reader.readString(Resources.startField)), StoreFormat.readArray(reader, Resources.entriesField).map(t => IndexEntry.fromJson(t)));
  }

  public find(path: string): IndexEntry | null {
    return this.byPath.get(path) ?? null;
  }

  public findUnchanged(entry: WalkedEntry): IndexEntry | null {
    const known = this.byPath.get(entry.path);
    return !Object.isUndefined(known) && known.matches(entry, this.start - Resources.racyWindowNanoseconds) ? known : null;
  }

  public toJson(): JsonObject {
    return {
      [Resources.formatVersionField]: Resources.formatVersion,
      [Resources.startField]: String(this.start),
      [Resources.entriesField]: this.entries.map(t => t.toJson())
    };
  }
}
