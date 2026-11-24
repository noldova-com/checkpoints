/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "@noldova/context.core";
import type { JsonObject } from "@noldova/context.json";

import { InvalidDateException } from "../exceptions/invalid-date.exception.ts";
import { LabelTooLongException } from "../exceptions/label-too-long.exception.ts";
import { Resources } from "../resources.ts";
import { WireForm } from "../services/wire-form.ts";
import { FolderReference } from "./folder-reference.ts";

export class CaptureRequest {
  public static readonly method: string = Resources.captureMethod;
  private static readonly FIELDS: readonly string[] = [Resources.folderField, Resources.labelField, Resources.asOfField];
  public readonly asOf: Date | null;
  public readonly folder: FolderReference;
  public readonly label: string | null;

  public constructor(folder: FolderReference, label: string | null, asOf: Date | null = null) {
    if (!Object.isNull(label) && label.length > Resources.maximumLabelLength)
      throw new LabelTooLongException(label.length);
    if (!Object.isNull(asOf) && Number.isNaN(asOf.getTime()))
      throw new InvalidDateException();

    this.asOf = Object.isNull(asOf) ? null : new Date(asOf.getTime());
    this.folder = folder;
    this.label = label;
  }

  public static fromJson(value: unknown): CaptureRequest {
    const reader = WireForm.read(value, Resources.captureRequestModel, CaptureRequest.FIELDS);
    return new CaptureRequest(FolderReference.fromJson(reader.readValue(Resources.folderField)), reader.readNullableString(Resources.labelField),
      WireForm.readNullableTime(reader, Resources.asOfField));
  }

  public toJson(): JsonObject {
    return {
      [Resources.folderField]: this.folder.toJson(),
      [Resources.labelField]: this.label,
      [Resources.asOfField]: Object.isNull(this.asOf) ? null : this.asOf.toISOString()
    };
  }
}
