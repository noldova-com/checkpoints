/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/context.json";

import { Resources } from "../resources.ts";
import { WireForm } from "../services/wire-form.ts";
import { FolderReference } from "./folder-reference.ts";
import { RestorePlan } from "./restore-plan.ts";

export class RestoreRequest {
  public static readonly method: string = Resources.restoreMethod;
  private static readonly FIELDS: readonly string[] = [Resources.folderField, Resources.planField];
  public readonly folder: FolderReference;
  public readonly plan: RestorePlan;

  public constructor(folder: FolderReference, plan: RestorePlan) {
    this.folder = folder;
    this.plan = plan;
  }

  public static fromJson(value: unknown): RestoreRequest {
    const reader = WireForm.read(value, Resources.restoreRequestModel, RestoreRequest.FIELDS);
    return new RestoreRequest(FolderReference.fromJson(reader.readValue(Resources.folderField)), RestorePlan.fromJson(reader.readValue(Resources.planField)));
  }

  public toJson(): JsonObject {
    return { [Resources.folderField]: this.folder.toJson(), [Resources.planField]: this.plan.toJson() };
  }
}
