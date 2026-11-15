/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { lstat, readdir, readlink, stat } from "node:fs/promises";
import path from "node:path";

import { ReadOutcome, ReadResult, type DiffTarget, type ReadRequest } from "@noldova/checkpoints.protocol";

import { EntryKind } from "../models/entry-kind.ts";
import { FolderFile } from "../models/folder-file.ts";
import type { FolderStore } from "../models/folder-store.ts";
import { ReadFailure } from "../models/read-failure.ts";
import { SideContent } from "../models/side-content.ts";
import { SideFile } from "../models/side-file.ts";
import type { SideListing } from "../models/side-listing.ts";
import { UnhashedFile } from "../models/unhashed-file.ts";
import { Resources } from "../resources.ts";
import { Failures } from "./failures.ts";
import { FolderFileReader } from "./folder-file.reader.ts";
import type { GitRunner } from "./git-runner.ts";
import { LineDiff } from "./line-diff.ts";
import type { ObjectReader } from "./object.reader.ts";
import { RepositoryName } from "./repository-name.ts";
import type { SideLoader } from "./side-loader.ts";
import { StoreOpener } from "./store-opener.ts";
import { TextProbe } from "./text-probe.ts";

export class CheckpointFileReader {
  private readonly git: GitRunner;
  private readonly loader: SideLoader;
  private readonly objects: ObjectReader;
  private readonly platform: string;

  public constructor(git: GitRunner, loader: SideLoader, objects: ObjectReader, platform: string) {
    this.git = git;
    this.loader = loader;
    this.objects = objects;
    this.platform = platform;
  }

  public async readAsync(store: FolderStore, request: ReadRequest, signal: AbortSignal): Promise<ReadResult> {
    const base = await StoreOpener.existsAsync(store) ? await this.loader.loadCheckpointAsync(store, request.checkpoint, signal) : null;
    if (base === null)
      return CheckpointFileReader.resultOf(ReadOutcome.CheckpointMissing);
    if (base.listing.unreadReasonOf(request.path) !== null)
      return CheckpointFileReader.resultOf(ReadOutcome.Unknown);

    const old = CheckpointFileReader.fileOf(base.listing, request.path);
    if (request.against === null)
      return old === null ? CheckpointFileReader.resultOf(ReadOutcome.PathMissing) : await this.readContentAsync(store, old, request.limit, signal);

    const current = await this.findTargetAsync(store, request, request.against, signal);
    if (current instanceof ReadOutcome)
      return CheckpointFileReader.resultOf(current);
    const oldSide = old === null ? null : await this.readSideAsync(store, request.folder.path, old, signal);
    if (oldSide instanceof ReadOutcome)
      return CheckpointFileReader.resultOf(oldSide);
    const currentSide = current === null ? null : await this.readSideAsync(store, request.folder.path, current, signal);
    if (currentSide instanceof ReadOutcome)
      return CheckpointFileReader.resultOf(currentSide);

    if (currentSide === null)
      return oldSide === null ? CheckpointFileReader.resultOf(ReadOutcome.PathMissing) : CheckpointFileReader.resultOfDiff(LineDiff.ofOneSide(oldSide.content, false), request.limit);
    if (oldSide === null)
      return CheckpointFileReader.resultOfDiff(LineDiff.ofOneSide(currentSide.content, true), request.limit);
    return await this.diffAsync(store, oldSide, currentSide, request.limit, signal);
  }

  private static fileOf(listing: SideListing, relativePath: string): SideFile | null {
    const entry = listing.entryOf(relativePath);
    return entry instanceof SideFile ? entry : null;
  }

  private static async findAsync<T>(location: string, name: string, read: (location: string) => Promise<T>): Promise<T | ReadFailure> {
    return await readdir(location)
      .then(async (t): Promise<T | ReadFailure> => t.includes(name) ? await read(path.join(location, name)) : ReadFailure.Gone)
      .catch((t: unknown) => ReadFailure.of(t));
  }

  private static isInFolder(file: SideFile | UnhashedFile): file is FolderFile | UnhashedFile {
    return file instanceof FolderFile || file instanceof UnhashedFile;
  }

  private static resultOf(outcome: ReadOutcome): ReadResult {
    return new ReadResult(outcome, new Uint8Array(), 0);
  }

  private static resultOfDiff(body: Buffer, limit: number): ReadResult {
    return new ReadResult(ReadOutcome.Read, LineDiff.cut(body, limit), body.length);
  }

  private static unknownOf(failure: ReadFailure): ReadOutcome | null {
    return failure.reason === null ? null : ReadOutcome.Unknown;
  }

  private async diffAsync(store: FolderStore, old: SideContent, current: SideContent, limit: number, signal: AbortSignal): Promise<ReadResult> {
    const oldId = await this.objectIdOfAsync(store, old, signal);
    const currentId = await this.objectIdOfAsync(store, current, signal);
    if (oldId === currentId)
      return CheckpointFileReader.resultOfDiff(Buffer.alloc(0), limit);
    const output = await this.git.runAsync(store, Resources.diffCommand, [...Resources.diffArguments, oldId, currentId], "", signal);
    return CheckpointFileReader.resultOfDiff(LineDiff.bodyOf(output), limit);
  }

  private async fileOfAsync(location: string): Promise<FolderFile | UnhashedFile | null> {
    const stats = await lstat(location, { bigint: true });
    const kind = EntryKind.ofStats(this.platform, stats);
    const fileId = Resources.formatFileId(stats.dev, stats.ino);
    if (kind === null)
      return null;
    if (kind === EntryKind.Link)
      return new FolderFile(kind, FolderFileReader.linkIdOf(await readlink(location, Resources.bufferEncoding)), location, Number(stats.size), fileId);
    return new UnhashedFile(location, fileId);
  }

  private async findInFolderAsync(folder: string, relativePath: string): Promise<FolderFile | UnhashedFile | ReadOutcome | null> {
    const names = relativePath.split(Resources.relativePathSeparator);
    if (names.some(t => RepositoryName.matches(t)))
      return null;

    let location = folder;
    for (const name of names.slice(0, -1)) {
      const found = await CheckpointFileReader.findAsync(location, name, t => lstat(t, { bigint: true }));
      if (found instanceof ReadFailure)
        return CheckpointFileReader.unknownOf(found);
      if (!found.isDirectory())
        return null;
      location = path.join(location, name);
    }
    const found = await CheckpointFileReader.findAsync(location, relativePath.slice(relativePath.lastIndexOf(Resources.relativePathSeparator) + 1), t => this.fileOfAsync(t));
    return found instanceof ReadFailure ? CheckpointFileReader.unknownOf(found) : found;
  }

  private async findTargetAsync(store: FolderStore, request: ReadRequest, against: DiffTarget, signal: AbortSignal): Promise<SideFile | UnhashedFile | ReadOutcome | null> {
    if (against.checkpoint !== null) {
      const target = await this.loader.loadCheckpointAsync(store, against.checkpoint, signal);
      if (target === null)
        return ReadOutcome.CheckpointMissing;
      return target.listing.unreadReasonOf(request.path) === null ? CheckpointFileReader.fileOf(target.listing, request.path) : ReadOutcome.Unknown;
    }
    if (!await Failures.recoverAsync(stat(request.folder.path).then(t => t.isDirectory()), t => Failures.isAbsent(t), false))
      return ReadOutcome.FolderMissing;
    return await this.findInFolderAsync(request.folder.path, request.path);
  }

  private async objectIdOfAsync(store: FolderStore, side: SideContent, signal: AbortSignal): Promise<string> {
    return CheckpointFileReader.isInFolder(side.file) ? await this.writeObjectAsync(store, side.content, signal) : side.file.objectId;
  }

  private async readContentAsync(store: FolderStore, file: SideFile, limit: number, signal: AbortSignal): Promise<ReadResult> {
    const object = await this.objects.readOneAsync(store, file.objectId, limit, Number.POSITIVE_INFINITY, signal);
    return new ReadResult(ReadOutcome.Read, object.head, object.size);
  }

  private async readSideAsync(store: FolderStore, folder: string, file: SideFile | UnhashedFile, signal: AbortSignal): Promise<SideContent | ReadOutcome | null> {
    if (!CheckpointFileReader.isInFolder(file)) {
      const object = await this.objects.readOneAsync(store, file.objectId, Resources.bigFileThreshold, Resources.bigFileThreshold, signal);
      return TextProbe.isText(object.size, object.head) ? new SideContent(file, object.head) : ReadOutcome.Binary;
    }

    const content = await FolderFileReader.readAsync(folder, file, Resources.bigFileThreshold + 1);
    if (content instanceof ReadFailure)
      return content.reason === null ? null : ReadOutcome.Unknown;
    return TextProbe.isText(content.length, content) ? new SideContent(file, content) : ReadOutcome.Binary;
  }

  private async writeObjectAsync(store: FolderStore, content: Buffer, signal: AbortSignal): Promise<string> {
    return (await this.git.runAsync(store, Resources.hashObjectCommand, Resources.hashObjectArguments, content, signal)).toString(Resources.utf8Encoding).trim();
  }
}
