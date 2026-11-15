/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/context.json";

import { Resources } from "../resources.ts";
import { CheckpointId } from "../services/checkpoint-id.ts";
import { WireForm } from "../services/wire-form.ts";
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
    const reader = WireForm.read(value, Resources.compareRequestModel, CompareRequest.FIELDS);
    return new CompareRequest(FolderReference.fromJson(reader.readValue(Resources.folderField)), reader.readString(Resources.fromField),
      reader.readNullableString(Resources.toField));
  }

  public toJson(): JsonObject {
    return { [Resources.folderField]: this.folder.toJson(), [Resources.fromField]: this.from, [Resources.toField]: this.to };
  }
}
