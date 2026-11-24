/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "@noldova/context.core";
import type { JsonObject } from "@noldova/context.json";

import { InvalidRelativePathException } from "../exceptions/invalid-relative-path.exception.ts";
import { StepSidesMismatchException } from "../exceptions/step-sides-mismatch.exception.ts";
import { Resources } from "../resources.ts";
import { RelativePath } from "../services/relative-path.ts";
import { WireForm } from "../services/wire-form.ts";
import { ChangeSide } from "./change-side.ts";
import { RestoreAction } from "./restore-action.ts";

export class RestoreStep {
  private static readonly FIELDS: readonly string[] = [Resources.pathField, Resources.actionField, Resources.beforeField, Resources.afterField];
  public readonly action: RestoreAction;
  public readonly after: ChangeSide | null;
  public readonly before: ChangeSide | null;
  public readonly path: string;

  public constructor(path: string, action: RestoreAction, before: ChangeSide | null, after: ChangeSide | null) {
    if (!RelativePath.isValid(path))
      throw new InvalidRelativePathException(path);
    if ((Object.isNull(before)) !== (action === RestoreAction.Write) || (Object.isNull(after)) !== (action === RestoreAction.Delete))
      throw new StepSidesMismatchException(action);

    this.action = action;
    this.after = after;
    this.before = before;
    this.path = path;
  }

  public static fromJson(value: unknown): RestoreStep {
    const reader = WireForm.read(value, Resources.restoreStepModel, RestoreStep.FIELDS);
    const before = reader.readValue(Resources.beforeField);
    const after = reader.readValue(Resources.afterField);
    return new RestoreStep(
      reader.readString(Resources.pathField),
      RestoreAction.fromJson(reader.readValue(Resources.actionField)),
      Object.isNull(before) ? null : ChangeSide.fromJson(before),
      Object.isNull(after) ? null : ChangeSide.fromJson(after));
  }

  public toJson(): JsonObject {
    return {
      [Resources.pathField]: this.path,
      [Resources.actionField]: this.action.toJson(),
      [Resources.beforeField]: Object.isNull(this.before) ? null : this.before.toJson(),
      [Resources.afterField]: Object.isNull(this.after) ? null : this.after.toJson()
    };
  }
}
