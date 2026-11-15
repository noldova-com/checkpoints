/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/context.json";

import { Resources } from "../resources.ts";
import { WireForm } from "../services/wire-form.ts";
import { FolderUsage } from "./folder-usage.ts";

export class StorageList {
  private static readonly FIELDS: readonly string[] = [Resources.foldersField];
  public readonly folders: readonly FolderUsage[];

  public constructor(folders: readonly FolderUsage[]) {
    this.folders = [...folders];
  }

  public static fromJson(value: unknown): StorageList {
    const reader = WireForm.read(value, Resources.storageListModel, StorageList.FIELDS);
    return new StorageList(WireForm.readArray(reader, Resources.foldersField).map(t => FolderUsage.fromJson(t)));
  }

  public toJson(): JsonObject {
    return { [Resources.foldersField]: this.folders.map(t => t.toJson()) };
  }
}
