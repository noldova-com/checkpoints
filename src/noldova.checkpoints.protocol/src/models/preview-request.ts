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
import { ScopePaths } from "../services/scope-paths.ts";
import type { JsonObject } from "../types/json-object.ts";
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
    const reader = new JsonObjectReader(value, Resources.previewRequestModel);
    reader.refuseOtherFields(PreviewRequest.FIELDS);
    return new PreviewRequest(FolderReference.fromJson(reader.read(Resources.folderField)), reader.readString(Resources.checkpointField),
      reader.readStringListOrNull(Resources.pathsField));
  }

  public toJson(): JsonObject {
    return { [Resources.folderField]: this.folder.toJson(), [Resources.checkpointField]: this.checkpoint, [Resources.pathsField]: ScopePaths.toJson(this.paths) };
  }
}
