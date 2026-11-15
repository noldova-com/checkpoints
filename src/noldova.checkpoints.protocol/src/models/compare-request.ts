/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { CheckpointId } from "../services/checkpoint-id.ts";
import { JsonObjectReader } from "../services/json-object.reader.ts";
import type { JsonObject } from "../types/json-object.ts";
import { FolderReference } from "./folder-reference.ts";

export class CompareRequest {
  public static readonly method: string = Resources.compareMethod;
  private static readonly FIELDS: readonly string[] = [Resources.folderField, Resources.fromField, Resources.toField];
  public readonly folder: FolderReference;
  public readonly from: string;
  public readonly to: string | null;

  public constructor(folder: FolderReference, from: string, to: string | null) {
    for (const id of [from, to])
      if (id !== null)
        CheckpointId.check(id);

    this.folder = folder;
    this.from = from;
    this.to = to;
  }

  public static fromJson(value: unknown): CompareRequest {
    const reader = new JsonObjectReader(value, Resources.compareRequestModel);
    reader.refuseOtherFields(CompareRequest.FIELDS);
    return new CompareRequest(FolderReference.fromJson(reader.read(Resources.folderField)), reader.readString(Resources.fromField),
      reader.readStringOrNull(Resources.toField));
  }

  public toJson(): JsonObject {
    return { [Resources.folderField]: this.folder.toJson(), [Resources.fromField]: this.from, [Resources.toField]: this.to };
  }
}
