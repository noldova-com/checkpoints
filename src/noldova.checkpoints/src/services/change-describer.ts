/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Change, ChangeSide, PathKind } from "@noldova/checkpoints.protocol";

import { FolderFile } from "../models/folder-file.ts";
import type { FolderStore } from "../models/folder-store.ts";
import type { ObjectBatch } from "../models/object-batch.ts";
import type { PendingChange } from "../models/pending-change.ts";
import type { SideEntry } from "../models/side-entry.ts";
import { TreeFile } from "../models/tree-file.ts";
import { Resources } from "../resources.ts";
import type { ObjectReader } from "./object.reader.ts";
import { TextProbe } from "./text-probe.ts";

export class ChangeDescriber {
  private readonly objects: ObjectReader;

  public constructor(objects: ObjectReader) {
    this.objects = objects;
  }

  public async describeAsync(store: FolderStore, folder: string, pending: readonly PendingChange[], signal: AbortSignal): Promise<readonly Change[]> {
    const stored = pending.flatMap(t => [t.before, t.after]).filter(t => t instanceof TreeFile);
    const objects = await this.objects.readAsync(store, stored.map(t => t.objectId), Resources.textProbeLength, Resources.bigFileThreshold, signal);
    const changes: Change[] = [];
    for (const change of pending) {
      signal.throwIfAborted();
      changes.push(new Change(change.path, change.status, await ChangeDescriber.sideOfAsync(folder, change.before, objects),
        await ChangeDescriber.sideOfAsync(folder, change.after, objects), change.unreadReason));
    }
    return changes;
  }

  private static async sideOfAsync(folder: string, file: SideEntry | null, objects: ObjectBatch): Promise<ChangeSide | null> {
    if (file === null)
      return null;
    if (file instanceof TreeFile)
      return TextProbe.sideOfObject(file.kind, objects.get(file.objectId));
    if (file instanceof FolderFile)
      return await TextProbe.sideOfFolderAsync(folder, file);
    return new ChangeSide(PathKind.Folder, null, false);
  }
}
