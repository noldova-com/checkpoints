/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from "node:path";

import { Resources } from "../resources.ts";

export class FolderStore {
  public readonly attributesFile: string;
  public readonly configFile: string;
  public readonly emptyFile: string;
  public readonly folder: string;
  public readonly folderFile: string;
  public readonly gitFolder: string;
  public readonly headFile: string;
  public readonly hooksFolder: string;
  public readonly housekeepingFile: string;
  public readonly indexFile: string;
  public readonly moduleFolder: string;
  public readonly restoreFile: string;

  public constructor(moduleFolder: string, identity: string) {
    this.folder = path.join(moduleFolder, Resources.foldersFolder, identity);
    this.gitFolder = path.join(this.folder, Resources.gitFolder);
    this.attributesFile = path.join(this.gitFolder, Resources.infoFolder, Resources.attributesFile);
    this.configFile = path.join(this.gitFolder, Resources.configFile);
    this.emptyFile = path.join(moduleFolder, Resources.emptyFile);
    this.folderFile = path.join(this.folder, Resources.folderFile);
    this.headFile = path.join(this.gitFolder, Resources.headFile);
    this.hooksFolder = path.join(moduleFolder, Resources.hooksFolder);
    this.housekeepingFile = path.join(this.folder, Resources.housekeepingFile);
    this.indexFile = path.join(this.folder, Resources.indexFile);
    this.moduleFolder = moduleFolder;
    this.restoreFile = path.join(this.folder, Resources.restoreFile);
  }
}
