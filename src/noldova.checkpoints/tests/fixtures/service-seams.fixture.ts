/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { RmOptions } from "node:fs";
import { link, lstat, rename, rm } from "node:fs/promises";

import { FreeSpace } from "../../src/services/free-space.ts";
import { RestoreJournal } from "../../src/services/restore-journal.ts";
import { FailureFixture } from "./failure.fixture.ts";

export class ServiceSeams {
  public static readonly system: ServiceSeams = new ServiceSeams(t => new RestoreJournal(t), FreeSpace.hasRoomAsync, link, FreeSpace.readAsync, rename, rm, lstat);

  public readonly hardLink: typeof link;
  public readonly hasRoom: typeof FreeSpace.hasRoomAsync;
  public readonly journals: (file: string) => RestoreJournal;
  public readonly readFree: typeof FreeSpace.readAsync;
  public readonly removeFolder: (folder: string, options: RmOptions) => Promise<void>;
  public readonly renameFolder: (from: string, to: string) => Promise<void>;
  public readonly statFile: (file: string) => Promise<{ readonly size: number }>;

  private constructor(
    journals: (file: string) => RestoreJournal,
    hasRoom: typeof FreeSpace.hasRoomAsync,
    hardLink: typeof link,
    readFree: typeof FreeSpace.readAsync,
    renameFolder: (from: string, to: string) => Promise<void>,
    removeFolder: (folder: string, options: RmOptions) => Promise<void>,
    statFile: (file: string) => Promise<{ readonly size: number }>) {
    this.hardLink = hardLink;
    this.hasRoom = hasRoom;
    this.journals = journals;
    this.readFree = readFree;
    this.removeFolder = removeFolder;
    this.renameFolder = renameFolder;
    this.statFile = statFile;
  }

  public withJournals(journals: (file: string) => RestoreJournal): ServiceSeams {
    return new ServiceSeams(journals, this.hasRoom, this.hardLink, this.readFree, this.renameFolder, this.removeFolder, this.statFile);
  }

  public withHasRoom(hasRoom: typeof FreeSpace.hasRoomAsync): ServiceSeams {
    return new ServiceSeams(this.journals, hasRoom, this.hardLink, this.readFree, this.renameFolder, this.removeFolder, this.statFile);
  }

  public withoutHardLinks(): ServiceSeams {
    return new ServiceSeams(this.journals, this.hasRoom, ServiceSeams.refuseLinkAsync, this.readFree, this.renameFolder, this.removeFolder, this.statFile);
  }

  public withReadFree(readFree: typeof FreeSpace.readAsync): ServiceSeams {
    return new ServiceSeams(this.journals, this.hasRoom, this.hardLink, readFree, this.renameFolder, this.removeFolder, this.statFile);
  }

  public withRenameFolder(renameFolder: (from: string, to: string) => Promise<void>): ServiceSeams {
    return new ServiceSeams(this.journals, this.hasRoom, this.hardLink, this.readFree, renameFolder, this.removeFolder, this.statFile);
  }

  public withRemoveFolder(removeFolder: (folder: string, options: RmOptions) => Promise<void>): ServiceSeams {
    return new ServiceSeams(this.journals, this.hasRoom, this.hardLink, this.readFree, this.renameFolder, removeFolder, this.statFile);
  }

  public withStatFile(statFile: (file: string) => Promise<{ readonly size: number }>): ServiceSeams {
    return new ServiceSeams(this.journals, this.hasRoom, this.hardLink, this.readFree, this.renameFolder, this.removeFolder, statFile);
  }

  private static async refuseLinkAsync(): Promise<void> {
    throw new FailureFixture("EPERM: operation not permitted, link", "EPERM");
  }
}
