/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "@noldova/context.core";
import type { JsonObject } from "@noldova/context.json";

import { InvalidReadLimitException } from "../exceptions/invalid-read-limit.exception.ts";
import { InvalidRelativePathException } from "../exceptions/invalid-relative-path.exception.ts";
import { Resources } from "../resources.ts";
import { CheckpointId } from "../services/checkpoint-id.ts";
import { RelativePath } from "../services/relative-path.ts";
import { WireForm } from "../services/wire-form.ts";
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
    const reader = WireForm.read(value, Resources.readRequestModel, ReadRequest.FIELDS);
    const against = reader.readValue(Resources.againstField);
    return new ReadRequest(
      FolderReference.fromJson(reader.readValue(Resources.folderField)),
      reader.readString(Resources.checkpointField),
      reader.readString(Resources.pathField),
      Object.isNull(against) ? null : DiffTarget.fromJson(against),
      reader.readNumber(Resources.limitField));
  }

  public toJson(): JsonObject {
    return {
      [Resources.folderField]: this.folder.toJson(),
      [Resources.checkpointField]: this.checkpoint,
      [Resources.pathField]: this.path,
      [Resources.againstField]: Object.isNull(this.against) ? null : this.against.toJson(),
      [Resources.limitField]: this.limit
    };
  }
}
