/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { BigIntStats } from "node:fs";

import { PathKind } from "@noldova/checkpoints.protocol";

import { UnknownEntryKindException } from "../exceptions/unknown-entry-kind.exception.ts";
import { UnknownGitModeException } from "../exceptions/unknown-git-mode.exception.ts";
import { Resources } from "../resources.ts";

export class EntryKind {
  public static readonly File: EntryKind = new EntryKind("File", Resources.fileGitMode, PathKind.File);
  public static readonly Executable: EntryKind = new EntryKind("Executable", Resources.executableGitMode, PathKind.Executable);
  public static readonly Link: EntryKind = new EntryKind("Link", Resources.linkGitMode, PathKind.Link);
  private static readonly ALL: readonly EntryKind[] = [EntryKind.File, EntryKind.Executable, EntryKind.Link];
  public readonly gitMode: string;
  public readonly pathKind: PathKind;
  public readonly value: string;

  private constructor(value: string, gitMode: string, pathKind: PathKind) {
    this.gitMode = gitMode;
    this.pathKind = pathKind;
    this.value = value;
  }

  public static ofStats(platform: string, stats: Pick<BigIntStats, "isFile" | "isSymbolicLink" | "mode">): EntryKind | null {
    if (stats.isSymbolicLink())
      return EntryKind.Link;
    if (!stats.isFile())
      return null;
    return platform !== Resources.windowsPlatform && (stats.mode & Resources.ownerExecuteBit) !== 0n ? EntryKind.Executable : EntryKind.File;
  }

  public static ofGitMode(mode: string): EntryKind {
    const kind = EntryKind.ALL.find(t => t.gitMode === mode);
    if (kind === undefined)
      throw new UnknownGitModeException(mode);
    return kind;
  }

  public static fromJson(value: unknown): EntryKind {
    const kind = EntryKind.ALL.find(t => t.value === value);
    if (kind === undefined)
      throw new UnknownEntryKindException(String(value));
    return kind;
  }

  public toJson(): string {
    return this.value;
  }
}
