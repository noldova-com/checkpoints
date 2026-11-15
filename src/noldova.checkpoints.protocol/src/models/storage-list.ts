/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { JsonObjectReader } from "../services/json-object.reader.ts";
import type { JsonObject } from "../types/json-object.ts";
import { FolderUsage } from "./folder-usage.ts";

export class StorageList {
  private static readonly FIELDS: readonly string[] = [Resources.foldersField];
  public readonly folders: readonly FolderUsage[];

  public constructor(folders: readonly FolderUsage[]) {
    this.folders = [...folders];
  }

  public static fromJson(value: unknown): StorageList {
    const reader = new JsonObjectReader(value, Resources.storageListModel);
    reader.refuseOtherFields(StorageList.FIELDS);
    return new StorageList(reader.readList(Resources.foldersField).map(t => FolderUsage.fromJson(t)));
  }

  public toJson(): JsonObject {
    return { [Resources.foldersField]: this.folders.map(t => t.toJson()) };
  }
}
