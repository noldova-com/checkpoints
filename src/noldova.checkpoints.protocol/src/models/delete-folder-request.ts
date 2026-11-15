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
import { FolderReference } from "./folder-reference.ts";

export class DeleteFolderRequest {
  public static readonly method: string = Resources.deleteFolderMethod;
  private static readonly FIELDS: readonly string[] = [Resources.folderField];
  public readonly folder: FolderReference;

  public constructor(folder: FolderReference) {
    this.folder = folder;
  }

  public static fromJson(value: unknown): DeleteFolderRequest {
    const reader = new JsonObjectReader(value, Resources.deleteFolderRequestModel);
    reader.refuseOtherFields(DeleteFolderRequest.FIELDS);
    return new DeleteFolderRequest(FolderReference.fromJson(reader.read(Resources.folderField)));
  }

  public toJson(): JsonObject {
    return { [Resources.folderField]: this.folder.toJson() };
  }
}
