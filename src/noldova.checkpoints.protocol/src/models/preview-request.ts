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
import { ScopePaths } from "../services/scope-paths.ts";
import { WireForm } from "../services/wire-form.ts";
import { FolderReference } from "./folder-reference.ts";

export class PreviewRequest {
  public static readonly method: string = Resources.previewRestoreMethod;
  private static readonly FIELDS: readonly string[] = [Resources.folderField, Resources.checkpointField, Resources.pathsField];
  public readonly checkpoint: string;
  public readonly folder: FolderReference;
  public readonly paths: readonly string[] | null;

  public constructor(folder: FolderReference, checkpoint: string, paths: readonly string[] | null) {
    CheckpointId.check(checkpoint);

    this.checkpoint = checkpoint;
    this.folder = folder;
    this.paths = ScopePaths.of(paths);
  }

  public static fromJson(value: unknown): PreviewRequest {
    const reader = WireForm.read(value, Resources.previewRequestModel, PreviewRequest.FIELDS);
    return new PreviewRequest(FolderReference.fromJson(reader.readValue(Resources.folderField)), reader.readString(Resources.checkpointField),
      WireForm.readNullableStringArray(reader, Resources.pathsField));
  }

  public toJson(): JsonObject {
    return { [Resources.folderField]: this.folder.toJson(), [Resources.checkpointField]: this.checkpoint, [Resources.pathsField]: ScopePaths.toJson(this.paths) };
  }
}
