/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/context.json";

import { SideSizeMismatchException } from "../exceptions/side-size-mismatch.exception.ts";
import { Resources } from "../resources.ts";
import { ByteSize } from "../services/byte-size.ts";
import { WireForm } from "../services/wire-form.ts";
import { PathKind } from "./path-kind.ts";

export class ChangeSide {
  private static readonly FIELDS: readonly string[] = [Resources.kindField, Resources.sizeField, Resources.isTextField];
  public readonly isText: boolean;
  public readonly kind: PathKind;
  public readonly size: number | null;

  public constructor(kind: PathKind, size: number | null, isText: boolean) {
    if ((kind === PathKind.Folder) !== (size === null) || kind === PathKind.Folder && isText)
      throw new SideSizeMismatchException(kind);
    if (size !== null)
      ByteSize.check(size);

    this.isText = isText;
    this.kind = kind;
    this.size = size;
  }

  public static fromJson(value: unknown): ChangeSide {
    const reader = WireForm.read(value, Resources.changeSideModel, ChangeSide.FIELDS);
    return new ChangeSide(PathKind.fromJson(reader.readValue(Resources.kindField)), WireForm.readNullableNumber(reader, Resources.sizeField),
      reader.readBoolean(Resources.isTextField));
  }

  public toJson(): JsonObject {
    return { [Resources.kindField]: this.kind.toJson(), [Resources.sizeField]: this.size, [Resources.isTextField]: this.isText };
  }
}
