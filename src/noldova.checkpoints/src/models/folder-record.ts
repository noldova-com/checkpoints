/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/context.json";

import { Resources } from "../resources.ts";
import { StoreFormat } from "../services/store-format.ts";

export class FolderRecord {
  private static readonly FIELDS: readonly string[] = [Resources.formatVersionField, Resources.pathField];
  public readonly path: string;

  public constructor(path: string) {
    this.path = path;
  }

  public static fromJson(value: unknown): FolderRecord {
    const reader = StoreFormat.read(value, Resources.folderRecordModel, FolderRecord.FIELDS);
    StoreFormat.check(reader);
    return new FolderRecord(reader.readString(Resources.pathField));
  }

  public toJson(): JsonObject {
    return { [Resources.formatVersionField]: Resources.formatVersion, [Resources.pathField]: this.path };
  }
}
