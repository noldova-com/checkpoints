/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { UnreadPath, type CaptureMode } from "@noldova/checkpoints.protocol";

import { StoreObjectMissingException } from "../exceptions/store-object-missing.exception.ts";
import { StoreObjectNotABlobException } from "../exceptions/store-object-not-a-blob.exception.ts";
import { CheckpointRecord } from "../models/checkpoint-record.ts";
import { FolderFile } from "../models/folder-file.ts";
import { FolderIndex } from "../models/folder-index.ts";
import type { FolderStore } from "../models/folder-store.ts";
import { IgnoreFile } from "../models/ignore-file.ts";
import { IgnoreRules } from "../models/ignore-rules.ts";
import { IndexEntry } from "../models/index-entry.ts";
import { LoadedCheckpoint } from "../models/loaded-checkpoint.ts";
import { SideListing } from "../models/side-listing.ts";
import type { StoredObject } from "../models/stored-object.ts";
import { WalkedListing } from "../models/walked-listing.ts";
import { Resources } from "../resources.ts";
import type { EntryReader } from "./entry.reader.ts";
import type { FolderWalker } from "./folder-walker.ts";
import { InputWriter } from "./input-writer.ts";
import type { ObjectReader } from "./object.reader.ts";
import { StoreFile } from "./store-file.ts";
import type { TreeLister } from "./tree-lister.ts";

export class SideLoader {
  private readonly objects: ObjectReader;
  private readonly reader: EntryReader;
  private readonly trees: TreeLister;
  private readonly walker: FolderWalker;

  public constructor(objects: ObjectReader, trees: TreeLister, walker: FolderWalker, reader: EntryReader) {
    this.objects = objects;
    this.reader = reader;
    this.trees = trees;
    this.walker = walker;
  }

  public async loadCheckpointAsync(store: FolderStore, id: string, signal: AbortSignal): Promise<LoadedCheckpoint | null> {
    const reference = `${Resources.checkpointReferencePrefix}${id}`;
    const found = await this.objects.readOneAsync(store, Resources.formatRevisionPath(reference, Resources.checkpointFile), Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, signal);
    if (!found.isBlob)
      return null;

    const record = StoreFile.parse(Resources.checkpointFile, found.head.toString(Resources.utf8Encoding), t => CheckpointRecord.fromJson(t));
    const tree = await this.trees.listAsync(store, reference, signal);
    return new LoadedCheckpoint(record, new SideListing(tree.files, record.emptyFolders, record.checkpoint.unreadPaths, await this.readRulesAsync(store, record, tree.rules, signal)));
  }

  public async loadFolderAsync(store: FolderStore, folder: string, mode: CaptureMode, signal: AbortSignal): Promise<SideListing> {
    return (await this.loadFolderWalkAsync(store, folder, mode, signal)).listing;
  }

  public async loadFolderWalkAsync(store: FolderStore, folder: string, mode: CaptureMode, signal: AbortSignal): Promise<WalkedListing> {
    const walk = await this.walker.walkAsync(folder, mode, signal);
    const index = await StoreFile.readAsync(store.indexFile, t => FolderIndex.fromJson(t)) ?? FolderIndex.Empty;
    const files = new Map<string, FolderFile>();
    const unreadPaths: UnreadPath[] = [...walk.unreadPaths];
    const discarded = InputWriter.discarding();
    for (const entry of walk.entries) {
      signal.throwIfAborted();
      const known = index.findUnchanged(entry);
      const read = known === null ? await this.reader.readAsync(discarded, entry) : IndexEntry.of(entry, known.objectId);
      if (read instanceof IndexEntry)
        files.set(entry.path, new FolderFile(read.kind, read.objectId, entry.location, read.size, read.fileId));
      if (read instanceof UnreadPath)
        unreadPaths.push(read);
    }
    discarded.end();
    return new WalkedListing(new SideListing(files, walk.emptyFolders, unreadPaths, walk.rules), walk);
  }

  private async readRulesAsync(store: FolderStore, record: CheckpointRecord, ruleObjects: ReadonlyMap<string, string>, signal: AbortSignal): Promise<IgnoreRules | null> {
    if (record.ignoreRules === null)
      return null;

    const rules = new IgnoreRules(record.ignoreRules.ignoresCase);
    for (const folder of record.ignoreRules.repositoryFolders)
      rules.addRepositoryFolder(folder);
    const contents = await this.objects.readAsync(store, [...ruleObjects.values()], Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, signal);
    for (const [folder, objectId] of ruleObjects)
      rules.addFile(new IgnoreFile(folder, SideLoader.ruleContentOf(objectId, contents.get(objectId)), rules.ignoresCase));
    return rules;
  }

  private static ruleContentOf(objectId: string, found: StoredObject): Buffer {
    if (found.type === Resources.missingType)
      throw new StoreObjectMissingException(objectId);
    if (!found.isBlob)
      throw new StoreObjectNotABlobException(objectId, Resources.formatObjectHeader(objectId, found.type, found.size));
    return found.head;
  }
}
