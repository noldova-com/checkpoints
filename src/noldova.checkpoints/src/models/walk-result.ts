/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "@noldova/context.core";
import { UnreadPath } from "@noldova/checkpoints.protocol";

import { RelativePath } from "../services/relative-path.ts";
import type { IgnoreRules } from "./ignore-rules.ts";
import type { LinkRecord } from "./link-record.ts";
import type { ReadFailure } from "./read-failure.ts";
import type { WalkedEntry } from "./walked-entry.ts";

export class WalkResult {
  private readonly emptyFolderList: string[] = [];
  private readonly entryList: WalkedEntry[] = [];
  private readonly folderIdMap: Map<string, string> = new Map();
  private readonly folderTimeMap: Map<string, bigint> = new Map();
  private readonly ignoredPathList: string[] = [];
  private readonly linkList: LinkRecord[] = [];
  private readonly repositoryFolderSet: Set<string> = new Set();
  private readonly repositoryPathList: string[] = [];
  private readonly unreadPathList: UnreadPath[] = [];
  public readonly rules: IgnoreRules | null;

  public constructor(rules: IgnoreRules | null) {
    this.rules = rules;
  }

  public get emptyFolders(): readonly string[] {
    return this.emptyFolderList;
  }

  public get entries(): readonly WalkedEntry[] {
    return this.entryList;
  }

  public get folderIds(): ReadonlyMap<string, string> {
    return this.folderIdMap;
  }

  public get folderTimes(): ReadonlyMap<string, bigint> {
    return this.folderTimeMap;
  }

  public get ignoredPaths(): readonly string[] {
    return this.ignoredPathList;
  }

  public get links(): readonly LinkRecord[] {
    return this.linkList;
  }

  public get repositoryFolders(): ReadonlySet<string> {
    return this.repositoryFolderSet;
  }

  public get repositoryPaths(): readonly string[] {
    return this.repositoryPathList;
  }

  public get unreadPaths(): readonly UnreadPath[] {
    return this.unreadPathList;
  }

  public addEmptyFolder(path: string): void {
    this.emptyFolderList.push(path);
  }

  public addEntry(entry: WalkedEntry): void {
    this.entryList.push(entry);
  }

  public addFolder(path: string, fileId: string, time: bigint): void {
    this.folderIdMap.set(path, fileId);
    this.folderTimeMap.set(path, time);
  }

  public forgetFolderTime(path: string): void {
    this.folderTimeMap.delete(path);
  }

  public addIgnoredPath(path: string): void {
    this.ignoredPathList.push(path);
  }

  public addRepositoryFolder(path: string): void {
    for (let folder = path; folder !== "" && !this.repositoryFolderSet.has(folder); folder = RelativePath.parentOf(folder))
      this.repositoryFolderSet.add(folder);
  }

  public addRepositoryPath(path: string): void {
    this.repositoryPathList.push(path);
  }

  public addFailure(path: string, failure: ReadFailure): boolean {
    const unread = failure.unreadOf(path);
    if (!Object.isNull(unread))
      this.unreadPathList.push(unread);
    return !Object.isNull(unread);
  }

  public addLink(link: LinkRecord): void {
    this.linkList.push(link);
  }

  public addUnreadPath(path: UnreadPath): void {
    this.unreadPathList.push(path);
  }
}
