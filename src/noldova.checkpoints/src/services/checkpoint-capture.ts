/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { stat } from "node:fs/promises";

import { CaptureMode, CaptureOutcome, CaptureResult, Checkpoint, UnreadPath, UnreadReason } from "@noldova/checkpoints.protocol";

import { CheckpointRecord } from "../models/checkpoint-record.ts";
import { EntryKind } from "../models/entry-kind.ts";
import { FolderIndex } from "../models/folder-index.ts";
import { FolderRecord } from "../models/folder-record.ts";
import type { FolderStore } from "../models/folder-store.ts";
import { IgnoreRecord } from "../models/ignore-record.ts";
import { IndexEntry } from "../models/index-entry.ts";
import type { WalkResult } from "../models/walk-result.ts";
import type { WalkedEntry } from "../models/walked-entry.ts";
import { Resources } from "../resources.ts";
import type { CheckpointIdSource } from "./checkpoint-id-source.ts";
import type { CheckpointLister } from "./checkpoint-lister.ts";
import { Clock } from "./clock.ts";
import { EntryReader } from "./entry.reader.ts";
import { Failures } from "./failures.ts";
import { FastImportLeftovers } from "./fast-import-leftovers.ts";
import type { FolderWalker } from "./folder-walker.ts";
import type { FreeSpace } from "./free-space.ts";
import { GitPath } from "./git-path.ts";
import type { GitRunner } from "./git-runner.ts";
import type { InputWriter } from "./input-writer.ts";
import { RelativePath } from "./relative-path.ts";
import { StoreFile } from "./store-file.ts";
import type { StoreOpener } from "./store-opener.ts";

export class CheckpointCapture {
  private readonly clock: Clock;
  private readonly git: GitRunner;
  private readonly ids: CheckpointIdSource;
  private readonly lister: CheckpointLister;
  private readonly opener: StoreOpener;
  private readonly reader: EntryReader;
  private readonly readFreeAsync: typeof FreeSpace.readAsync;
  private readonly walker: FolderWalker;

  public constructor(
    git: GitRunner,
    opener: StoreOpener,
    walker: FolderWalker,
    lister: CheckpointLister,
    ids: CheckpointIdSource,
    platform: string,
    readFreeAsync: typeof FreeSpace.readAsync,
    clock: Clock = Clock.system) {
    this.clock = clock;
    this.git = git;
    this.ids = ids;
    this.lister = lister;
    this.opener = opener;
    this.reader = new EntryReader(platform);
    this.readFreeAsync = readFreeAsync;
    this.walker = walker;
  }

  public async captureAsync(
    store: FolderStore, folder: string, label: string | null, mode: CaptureMode, asOf: Date | null, signal: AbortSignal
  ): Promise<CaptureResult> {
    if (!await Failures.recoverAsync(stat(folder).then(t => t.isDirectory()), t => Failures.isAbsent(t), false))
      return new CaptureResult(CaptureOutcome.FolderMissing, null, null, null);

    const time = new Date(this.clock.now());
    const start = this.clock.fileTime();
    await this.opener.openAsync(store, signal);
    const walk = await this.walker.walkAsync(folder, mode, signal);
    const index = await StoreFile.readAsync(store.indexFile, t => FolderIndex.fromJson(t)) ?? FolderIndex.Empty;
    const parent = await this.lister.findNewestAsync(store, signal);
    const cutoff = asOf === null ? null : BigInt(asOf.getTime()) * Resources.nanosecondsPerMillisecond - Resources.racyWindowNanoseconds;
    const adding = walk.entries.reduce((sum, t) => CheckpointCapture.needsRead(t, index, cutoff) ? sum + t.size : sum, 0);
    if (adding > Resources.maximumCaptureContent)
      return new CaptureResult(CaptureOutcome.TooLarge, null, null, null, adding, Resources.maximumCaptureContent);
    const free = await this.readFreeAsync(store.folder);
    if (free < Resources.spaceMargin + adding)
      return new CaptureResult(CaptureOutcome.LowDiskSpace, null, free, Resources.spaceMargin + adding);

    const kept: IndexEntry[] = [];
    const earlierPaths: string[] = [];
    const unreadPaths: UnreadPath[] = [...walk.unreadPaths];
    const keepEarlier = (path: string): void => {
      const earlier = index.find(path);
      if (earlier === null)
        return;
      kept.push(earlier);
      earlierPaths.push(path);
    };
    const leftovers = new FastImportLeftovers(store);
    let left = free;
    const imported = await this.importAsync(store, async input => {
      input.meterEvery(Resources.spaceCheckInterval, async written => {
        await leftovers.listOnceAsync();
        left = await this.readFreeAsync(store.folder);
        return left >= Resources.spaceMargin + Math.max(adding - written, 0);
      });
      for (const entry of walk.entries) {
        signal.throwIfAborted();
        const known = index.findUnchanged(entry);
        if (CheckpointCapture.isTooLarge(entry))
          unreadPaths.push(new UnreadPath(entry.path, UnreadReason.TooLarge, null));
        else if (known !== null)
          kept.push(IndexEntry.of(entry, known.objectId));
        else if (CheckpointCapture.isAtOrAfter(entry, cutoff))
          keepEarlier(entry.path);
        else {
          const result = await this.reader.readAsync(input, entry);
          if (input.isStopped)
            return null;
          if (result instanceof IndexEntry)
            kept.push(result);
          else if (cutoff !== null && (result === null || result.reason === UnreadReason.Changing))
            keepEarlier(entry.path);
          else if (result instanceof UnreadPath)
            unreadPaths.push(result);
        }
      }
      for (const path of CheckpointCapture.goneSince(index, walk, cutoff))
        keepEarlier(path);

      const taken = new Checkpoint(this.ids.next(), time, mode, label, unreadPaths);
      const ignoreRecord = walk.rules === null ? null : new IgnoreRecord(walk.rules.ignoresCase, walk.rules.repositoryFolders);
      const record = new CheckpointRecord(taken, walk.emptyFolders, walk.links, ignoreRecord, earlierPaths);
      await input.writeAsync(CheckpointCapture.formatCommit(taken, parent, kept));
      for (const file of walk.rules?.files ?? [])
        await input.writeAsync(CheckpointCapture.formatInline(GitPath.ofRule(file.folderPath), file.content));
      input.stopMetering();
      await input.writeAsync(CheckpointCapture.formatInline(Resources.checkpointFile, Buffer.from(JSON.stringify(record.toJson()))));
      return taken;
    }, signal);
    if (imported === null) {
      await leftovers.removeAddedAsync();
      return new CaptureResult(CaptureOutcome.LowDiskSpace, null, left, Resources.spaceMargin + adding);
    }

    const checkpoint = imported;
    await StoreFile.writeAsync(store.indexFile, new FolderIndex(start, kept).toJson());
    await StoreFile.writeAsync(store.folderFile, new FolderRecord(folder).toJson());
    return new CaptureResult(CaptureOutcome.Captured, checkpoint, null, null);
  }

  public newId(): string {
    return this.ids.next();
  }

  public async captureMovedAsync(store: FolderStore, entries: readonly WalkedEntry[], label: string, id: string): Promise<Checkpoint | null> {
    const existing = (await this.lister.listAsync(store, Resources.neverCancelled)).find(t => t.id === id);
    if (existing !== undefined)
      return existing;
    const time = new Date(this.clock.now());
    const parent = await this.lister.findNewestAsync(store, Resources.neverCancelled);
    const kept: IndexEntry[] = [];
    const unreadPaths: UnreadPath[] = [];
    return await this.importAsync(store, async input => {
      for (const entry of entries) {
        const result = await this.reader.readAsync(input, entry);
        if (result instanceof IndexEntry)
          kept.push(result);
        if (result instanceof UnreadPath)
          unreadPaths.push(result);
      }
      const taken = new Checkpoint(id, time, CaptureMode.EveryFile, label, unreadPaths);
      await input.writeAsync(CheckpointCapture.formatCommit(taken, parent, kept));
      await input.writeAsync(CheckpointCapture.formatInline(Resources.checkpointFile, Buffer.from(JSON.stringify(new CheckpointRecord(taken, [], [], null).toJson()))));
      return taken;
    }, Resources.neverCancelled);
  }

  private static goneSince(index: FolderIndex, walk: WalkResult, cutoff: bigint | null): readonly string[] {
    if (cutoff === null)
      return [];
    const walked = new Set([...walk.entries.map(t => t.path), ...walk.folderTimes.keys()]);
    const leftOut = new Set([...walk.ignoredPaths, ...walk.repositoryPaths, ...walk.unreadPaths.map(t => t.path)]);
    return index.entries.map(t => t.path).filter(path => {
      if (walked.has(path) || leftOut.has(path))
        return false;
      let folder = RelativePath.parentOf(path);
      let time = walk.folderTimes.get(folder);
      while (time === undefined) {
        if (leftOut.has(folder))
          return false;
        folder = RelativePath.parentOf(folder);
        time = walk.folderTimes.get(folder);
      }
      return time >= cutoff;
    });
  }

  private static isAtOrAfter(entry: WalkedEntry, cutoff: bigint | null): boolean {
    return cutoff !== null && (entry.modified >= cutoff || entry.changed >= cutoff);
  }

  private static isTooLarge(entry: WalkedEntry): boolean {
    return entry.kind !== EntryKind.Link && entry.size > Resources.maximumFileSize;
  }

  private static needsRead(entry: WalkedEntry, index: FolderIndex, cutoff: bigint | null): boolean {
    return !CheckpointCapture.isTooLarge(entry) && index.findUnchanged(entry) === null && !CheckpointCapture.isAtOrAfter(entry, cutoff);
  }

  private async importAsync(store: FolderStore, write: (input: InputWriter) => Promise<Checkpoint | null>, signal: AbortSignal): Promise<Checkpoint | null> {
    const { written: taken, commit } = await this.git.importAsync(store, write, signal).catch((error: unknown) => {
      this.lister.forget(store);
      throw error;
    });
    if (taken === null || commit === null) {
      this.lister.forget(store);
      return null;
    }
    this.lister.remember(store, taken.id, commit);
    return taken;
  }

  private static formatCommit(checkpoint: Checkpoint, parent: string | null, kept: readonly IndexEntry[]): string {
    const signature = Resources.formatCommitSignature(Math.floor(checkpoint.time.getTime() / Resources.millisecondsPerSecond));
    const message = Resources.formatCheckpointMessage(checkpoint.id);
    return [
      Resources.formatFastImportCommit(`${Resources.checkpointReferencePrefix}${checkpoint.id}`),
      Resources.formatFastImportMark(Resources.commitMark),
      Resources.formatFastImportAuthor(signature),
      Resources.formatFastImportCommitter(signature),
      Resources.formatFastImportData(Buffer.byteLength(message)),
      message,
      ...(parent === null ? [] : [Resources.formatFastImportFrom(parent)]),
      Resources.fastImportDeleteAll,
      ...kept.map(t => Resources.formatFastImportModify(t.kind.gitMode, t.objectId, GitPath.quote(GitPath.ofEntry(t.path)))),
      ""
    ].join(Resources.lineFeed);
  }

  private static formatInline(treePath: string, content: Buffer): Buffer {
    const command = Resources.formatFastImportInline(EntryKind.File.gitMode, GitPath.quote(treePath), content.length);
    return Buffer.concat([Buffer.from(command), content, Buffer.from(Resources.lineFeed)]);
  }
}
