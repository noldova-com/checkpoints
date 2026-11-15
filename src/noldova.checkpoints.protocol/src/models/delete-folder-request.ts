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
import { FolderReference } from "./folder-reference.ts";

export class DeleteFolderRequest {
  public static readonly method: string = Resources.deleteFolderMethod;
  private static readonly FIELDS: readonly string[] = [Resources.folderField];
  public readonly folder: FolderReference;

  public constructor(folder: FolderReference) {
    this.folder = folder;
  }

  public static fromJson(value: unknown): DeleteFolderRequest {
    const reader = WireForm.read(value, Resources.deleteFolderRequestModel, DeleteFolderRequest.FIELDS);
    return new DeleteFolderRequest(FolderReference.fromJson(reader.readValue(Resources.folderField)));
  }

  public toJson(): JsonObject {
    return { [Resources.folderField]: this.folder.toJson() };
  }
}
