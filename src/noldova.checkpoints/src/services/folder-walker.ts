/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { BigIntStats } from "node:fs";
import { lstat, readdir, stat } from "node:fs/promises";
import path from "node:path";

import { CaptureMode } from "@noldova/checkpoints.protocol";

import { EntryKind } from "../models/entry-kind.ts";
import { IgnoreFile } from "../models/ignore-file.ts";
import { IgnoreRules } from "../models/ignore-rules.ts";
import { LinkKind } from "../models/link-kind.ts";
import { LinkRecord } from "../models/link-record.ts";
import { ReadFailure } from "../models/read-failure.ts";
import { WalkedChild } from "../models/walked-child.ts";
import { WalkedEntry } from "../models/walked-entry.ts";
import { WalkResult } from "../models/walk-result.ts";
import { Resources } from "../resources.ts";
import { CaseProbe } from "./case-probe.ts";
import { Failures } from "./failures.ts";
import { IgnoreFileReader } from "./ignore-file.reader.ts";
import { NameDecoder } from "./name-decoder.ts";
import { RelativePath } from "./relative-path.ts";
import { RepositoryName } from "./repository-name.ts";

export class FolderWalker {
  private readonly platform: string;

  public constructor(platform: string) {
    this.platform = platform;
  }

  public async walkAsync(folder: string, mode: CaptureMode, signal: AbortSignal): Promise<WalkResult | null> {
    return await Failures.recoverAsync(this.walkFolderAsync(folder, mode, signal), t => Failures.isAbsent(t), null);
  }

  private async walkFolderAsync(folder: string, mode: CaptureMode, signal: AbortSignal): Promise<WalkResult> {
    const names = (await readdir(folder, Resources.bufferEncoding)).sort(Buffer.compare);
    const result = new WalkResult(mode === CaptureMode.IgnoreFiles ? new IgnoreRules(await CaseProbe.ignoresCaseAsync(folder, names, this.platform)) : null);
    const root = await stat(folder, { bigint: true });
    result.addFolder("", FolderWalker.idOf(root), FolderWalker.timeOf(root));
    await this.walkNamesAsync(folder, "", names, result, signal);
    result.addFolder("", FolderWalker.idOf(root), FolderWalker.timeOf(await stat(folder, { bigint: true })));
    return result;
  }

  private static idOf(stats: BigIntStats): string {
    return Resources.formatFileId(stats.dev, stats.ino);
  }

  private static async readChildAsync(location: string, leavesOut: (stats: BigIntStats) => boolean): Promise<WalkedChild | null> {
    const stats = await lstat(location, { bigint: true });
    if (leavesOut(stats))
      return null;
    return new WalkedChild(stats, stats.isDirectory() ? (await readdir(location, Resources.bufferEncoding)).sort(Buffer.compare) : null);
  }

  private static timeOf(stats: BigIntStats): bigint {
    return stats.mtimeNs > stats.ctimeNs ? stats.mtimeNs : stats.ctimeNs;
  }

  private static leavesOut(stats: BigIntStats, childPath: string, repositories: ReadonlySet<string>, result: WalkResult): boolean {
    if (repositories.has(FolderWalker.idOf(stats))) {
      result.addRepositoryPath(childPath);
      return true;
    }
    if (result.rules?.isIgnored(childPath, stats.isDirectory()) !== true)
      return false;
    result.addIgnoredPath(childPath);
    return true;
  }

  private static async readLinkKindAsync(location: string): Promise<LinkKind | ReadFailure> {
    const target = await stat(location).catch((t: unknown) => ReadFailure.of(t));
    if (target === ReadFailure.Gone || target === ReadFailure.Changing)
      return LinkKind.File;
    if (target instanceof ReadFailure)
      return target;
    return target.isDirectory() ? LinkKind.Folder : LinkKind.File;
  }

  private static async readRepositoryIdsAsync(location: string, names: readonly string[]): Promise<ReadonlySet<string>> {
    const read = await Promise.all(names.map(t => lstat(path.join(location, t), { bigint: true }).catch(ReadFailure.of)));
    return new Set(read.filter((t): t is BigIntStats => !(t instanceof ReadFailure)).map(t => FolderWalker.idOf(t)));
  }

  private static async readRulesAsync(rules: IgnoreRules, location: string, folderPath: string, repositoryNames: readonly string[]): Promise<void> {
    if (folderPath !== "" && repositoryNames.length > 0)
      rules.addRepositoryFolder(folderPath);

    const content = await IgnoreFileReader.readAsync(path.join(location, Resources.ignoreFileName));
    if (content !== null)
      rules.addFile(new IgnoreFile(folderPath, content, rules.ignoresCase));
  }

  private async walkChildAsync(location: string, childPath: string, repositories: ReadonlySet<string>, result: WalkResult, signal: AbortSignal): Promise<boolean> {
    const read = await FolderWalker.readChildAsync(location, t => FolderWalker.leavesOut(t, childPath, repositories, result))
      .catch((t: unknown) => ReadFailure.of(t));
    if (read instanceof ReadFailure)
      return result.addFailure(childPath, read);
    if (read === null)
      return false;

    const { stats, names } = read;
    if (names !== null) {
      result.addFolder(childPath, FolderWalker.idOf(stats), FolderWalker.timeOf(stats));
      if (!await this.walkNamesAsync(location, childPath, names, result, signal))
        result.addEmptyFolder(childPath);
      const after = await lstat(location, { bigint: true }).catch((t: unknown) => ReadFailure.of(t));
      if (after instanceof ReadFailure)
        result.forgetFolderTime(childPath);
      else
        result.addFolder(childPath, FolderWalker.idOf(stats), FolderWalker.timeOf(after));
      return true;
    }

    const kind = EntryKind.ofStats(this.platform, stats);
    if (kind === null)
      return false;
    if (kind !== EntryKind.Link || this.platform !== Resources.windowsPlatform) {
      result.addEntry(new WalkedEntry(childPath, location, kind, stats));
      return true;
    }

    const linkKind = await FolderWalker.readLinkKindAsync(location);
    if (linkKind instanceof ReadFailure)
      return result.addFailure(childPath, linkKind);
    result.addEntry(new WalkedEntry(childPath, location, kind, stats));
    result.addLink(new LinkRecord(childPath, linkKind));
    return true;
  }

  private async walkNamesAsync(location: string, folderPath: string, names: readonly Buffer[], result: WalkResult, signal: AbortSignal): Promise<boolean> {
    const decoded = NameDecoder.decode(names, folderPath, result);
    const repositoryNames = decoded.filter(t => RepositoryName.matches(t));
    for (const name of repositoryNames)
      result.addRepositoryPath(RelativePath.join(folderPath, name));
    if (repositoryNames.length > 0)
      result.addRepositoryFolder(folderPath);
    const repositories = await FolderWalker.readRepositoryIdsAsync(location, repositoryNames);
    if (result.rules !== null)
      await FolderWalker.readRulesAsync(result.rules, location, folderPath, repositoryNames);
    let kept = decoded.length < names.length;
    for (const name of decoded.filter(t => !RepositoryName.matches(t))) {
      signal.throwIfAborted();
      if (await this.walkChildAsync(path.join(location, name), RelativePath.join(folderPath, name), repositories, result, signal))
        kept = true;
    }
    return kept;
  }
}
