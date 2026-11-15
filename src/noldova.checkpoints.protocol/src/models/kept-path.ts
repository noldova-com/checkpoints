/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/context.json";

import { InvalidRelativePathException } from "../exceptions/invalid-relative-path.exception.ts";
import { Resources } from "../resources.ts";
import { RelativePath } from "../services/relative-path.ts";
import { WireForm } from "../services/wire-form.ts";
import { KeepReason } from "./keep-reason.ts";

export class KeptPath {
  private static readonly FIELDS: readonly string[] = [Resources.pathField, Resources.reasonField];
  public readonly path: string;
  public readonly reason: KeepReason;

  public constructor(path: string, reason: KeepReason) {
    if (!RelativePath.isValid(path))
      throw new InvalidRelativePathException(path);

    this.path = path;
    this.reason = reason;
  }

  public static fromJson(value: unknown): KeptPath {
    const reader = WireForm.read(value, Resources.keptPathModel, KeptPath.FIELDS);
    return new KeptPath(reader.readString(Resources.pathField), KeepReason.fromJson(reader.readValue(Resources.reasonField)));
  }

  public toJson(): JsonObject {
    return { [Resources.pathField]: this.path, [Resources.reasonField]: this.reason.toJson() };
  }
}
