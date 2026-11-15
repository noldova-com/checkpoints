/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/context.json";

import { LabelTooLongException } from "../exceptions/label-too-long.exception.ts";
import { Resources } from "../resources.ts";
import { WireForm } from "../services/wire-form.ts";
import { FolderReference } from "./folder-reference.ts";

export class CaptureRequest {
  public static readonly method: string = Resources.captureMethod;
  private static readonly FIELDS: readonly string[] = [Resources.folderField, Resources.labelField];
  public readonly folder: FolderReference;
  public readonly label: string | null;

  public constructor(folder: FolderReference, label: string | null) {
    if (label !== null && label.length > Resources.maximumLabelLength)
      throw new LabelTooLongException(label.length);

    this.folder = folder;
    this.label = label;
  }

  public static fromJson(value: unknown): CaptureRequest {
    const reader = WireForm.read(value, Resources.captureRequestModel, CaptureRequest.FIELDS);
    return new CaptureRequest(FolderReference.fromJson(reader.readValue(Resources.folderField)), reader.readNullableString(Resources.labelField));
  }

  public toJson(): JsonObject {
    return { [Resources.folderField]: this.folder.toJson(), [Resources.labelField]: this.label };
  }
}
