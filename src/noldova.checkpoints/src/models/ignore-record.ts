/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { JsonObjectReader, type JsonObject } from "@noldova/checkpoints.protocol";

import { StoreFieldNotABooleanException } from "../exceptions/store-field-not-a-boolean.exception.ts";
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
    const reader = new JsonObjectReader(value, Resources.ignoreRecordModel);
    reader.refuseOtherFields(IgnoreRecord.FIELDS);
    const ignoresCase = reader.read(Resources.ignoresCaseField);
    if (typeof ignoresCase !== "boolean")
      throw new StoreFieldNotABooleanException(Resources.ignoresCaseField);
    return new IgnoreRecord(ignoresCase, StoreFormat.readStringList(reader, Resources.repositoryFoldersField));
  }

  public toJson(): JsonObject {
    return { [Resources.ignoresCaseField]: this.ignoresCase, [Resources.repositoryFoldersField]: [...this.repositoryFolders] };
  }
}
