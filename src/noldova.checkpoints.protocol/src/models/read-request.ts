/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { InvalidReadLimitException } from "../exceptions/invalid-read-limit.exception.ts";
import { InvalidRelativePathException } from "../exceptions/invalid-relative-path.exception.ts";
import { Resources } from "../resources.ts";
import { CheckpointId } from "../services/checkpoint-id.ts";
import { JsonObjectReader } from "../services/json-object.reader.ts";
import { RelativePath } from "../services/relative-path.ts";
import type { JsonObject } from "../types/json-object.ts";
import { DiffTarget } from "./diff-target.ts";
import { FolderReference } from "./folder-reference.ts";

export class ReadRequest {
  public static readonly method: string = Resources.readMethod;
  private static readonly FIELDS: readonly string[] = [
    Resources.folderField, Resources.checkpointField, Resources.pathField, Resources.againstField, Resources.limitField
  ];
  public readonly against: DiffTarget | null;
  public readonly checkpoint: string;
  public readonly folder: FolderReference;
  public readonly limit: number;
  public readonly path: string;

  public constructor(folder: FolderReference, checkpoint: string, path: string, against: DiffTarget | null, limit: number) {
    CheckpointId.check(checkpoint);
    if (!RelativePath.isValid(path))
      throw new InvalidRelativePathException(path);
    if (!Number.isSafeInteger(limit) || limit < Resources.minimumReadLimit || limit > Resources.maximumReadLimit)
      throw new InvalidReadLimitException(limit);

    this.against = against;
    this.checkpoint = checkpoint;
    this.folder = folder;
    this.limit = limit;
    this.path = path;
  }

  public static fromJson(value: unknown): ReadRequest {
    const reader = new JsonObjectReader(value, Resources.readRequestModel);
    reader.refuseOtherFields(ReadRequest.FIELDS);
    const against = reader.read(Resources.againstField);
    return new ReadRequest(
      FolderReference.fromJson(reader.read(Resources.folderField)),
      reader.readString(Resources.checkpointField),
      reader.readString(Resources.pathField),
      against === null ? null : DiffTarget.fromJson(against),
      reader.readNumber(Resources.limitField));
  }

  public toJson(): JsonObject {
    return {
      [Resources.folderField]: this.folder.toJson(),
      [Resources.checkpointField]: this.checkpoint,
      [Resources.pathField]: this.path,
      [Resources.againstField]: this.against === null ? null : this.against.toJson(),
      [Resources.limitField]: this.limit
    };
  }
}
