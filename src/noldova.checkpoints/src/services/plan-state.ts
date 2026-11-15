/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createHash } from "node:crypto";

import { FolderFile } from "../models/folder-file.ts";
import type { PendingChange } from "../models/pending-change.ts";
import { SideFile } from "../models/side-file.ts";
import type { WalkResult } from "../models/walk-result.ts";
import { Resources } from "../resources.ts";
import { RelativePath } from "./relative-path.ts";

export class PlanState {
  public static digestOf(changes: readonly PendingChange[], walk: WalkResult): string {
    const folders = new Set<string>([""]);
    for (const change of changes)
      for (let folder = RelativePath.parentOf(change.path); folder !== "" && !folders.has(folder); folder = RelativePath.parentOf(folder))
        folders.add(folder);

    const hash = createHash(Resources.sumAlgorithm);
    for (const change of changes) {
      const file = change.before;
      const placed = file instanceof FolderFile ? file : null;
      const fileId = placed?.fileId ?? walk.folderIds.get(change.path) ?? null;
      hash.update(`${JSON.stringify([change.path, file?.kind.value ?? null, file instanceof SideFile ? file.objectId : null, placed?.size ?? null, fileId])}${Resources.lineFeed}`);
    }
    for (const folder of [...folders].sort())
      hash.update(`${JSON.stringify([folder, walk.folderIds.get(folder) ?? null])}${Resources.lineFeed}`);
    return hash.digest(Resources.hexEncoding);
  }
}
