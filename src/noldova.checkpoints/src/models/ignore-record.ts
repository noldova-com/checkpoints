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

export class IgnoreRecord {
  private static readonly FIELDS: readonly string[] = [Resources.ignoresCaseField, Resources.repositoryFoldersField];
  public readonly ignoresCase: boolean;
  public readonly repositoryFolders: readonly string[];

  public constructor(ignoresCase: boolean, repositoryFolders: readonly string[]) {
    this.ignoresCase = ignoresCase;
    this.repositoryFolders = [...repositoryFolders];
  }

  public static fromJson(value: unknown): IgnoreRecord {
    const reader = StoreFormat.read(value, Resources.ignoreRecordModel, IgnoreRecord.FIELDS);
    return new IgnoreRecord(reader.readBoolean(Resources.ignoresCaseField), reader.readStringArray(Resources.repositoryFoldersField));
  }

  public toJson(): JsonObject {
    return { [Resources.ignoresCaseField]: this.ignoresCase, [Resources.repositoryFoldersField]: [...this.repositoryFolders] };
  }
}
