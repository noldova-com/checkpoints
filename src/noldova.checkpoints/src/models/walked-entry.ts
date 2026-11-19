/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { BigIntStats } from "node:fs";

import { Resources } from "../resources.ts";
import { EntryKind } from "./entry-kind.ts";

export class WalkedEntry {
  public readonly changed: bigint;
  public readonly fileId: string;
  public readonly kind: EntryKind;
  public readonly location: string;
  public readonly modified: bigint;
  public readonly path: string;
  public readonly size: number;

  public constructor(path: string, location: string, kind: EntryKind, stats: BigIntStats) {
    this.changed = stats.ctimeNs;
    this.fileId = Resources.formatFileId(stats.dev, stats.ino);
    this.kind = kind;
    this.location = location;
    this.modified = stats.mtimeNs;
    this.path = path;
    this.size = Number(stats.size);
  }

  public get isTooLarge(): boolean {
    return this.kind !== EntryKind.Link && this.size > Resources.maximumFileSize;
  }

  public isUnchanged(stats: BigIntStats): boolean {
    return stats.size === BigInt(this.size) && stats.mtimeNs === this.modified && stats.ctimeNs === this.changed && Resources.formatFileId(stats.dev, stats.ino) === this.fileId;
  }
}
