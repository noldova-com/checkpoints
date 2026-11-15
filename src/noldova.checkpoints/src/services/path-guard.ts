/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { RestoreFolderChangedException } from "../exceptions/restore-folder-changed.exception.ts";
import { Resources } from "../resources.ts";
import { RelativePath } from "./relative-path.ts";
import { RestorePaths } from "./restore-paths.ts";

export class PathGuard {
  private readonly folder: string;
  private readonly ids: Map<string, string>;

  public constructor(folder: string, ids: ReadonlyMap<string, string>) {
    this.folder = folder;
    this.ids = new Map(ids);
  }

  public async checkAsync(relativePath: string): Promise<void> {
    await this.checkFolderAsync(RelativePath.parentOf(relativePath), relativePath);
  }

  public async checkFolderAsync(relativeFolder: string, changing: string = relativeFolder): Promise<void> {
    const folders = [""];
    for (let folder = relativeFolder; folder !== ""; folder = RelativePath.parentOf(folder))
      folders.splice(1, 0, folder);
    for (const folder of folders) {
      const stats = await RestorePaths.lstatAsync(RestorePaths.locationOf(this.folder, folder));
      if (stats === null || !RestorePaths.isFolder(stats))
        throw new RestoreFolderChangedException(changing, folder);
      const fileId = RestorePaths.fileIdOf(stats);
      const known = this.ids.get(folder);
      if (known === undefined)
        this.ids.set(folder, fileId);
      else if (known !== fileId)
        throw new RestoreFolderChangedException(changing, folder);
    }
  }

  public async renewAsync(relativeFolder: string): Promise<void> {
    for (const folder of [...this.ids.keys()])
      if (folder === relativeFolder || folder.startsWith(`${relativeFolder}${Resources.relativePathSeparator}`))
        this.ids.delete(folder);
    await this.checkFolderAsync(relativeFolder);
  }
}
