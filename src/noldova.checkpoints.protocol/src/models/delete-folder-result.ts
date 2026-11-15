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
import { DeleteFolderOutcome } from "./delete-folder-outcome.ts";

export class DeleteFolderResult {
  private static readonly FIELDS: readonly string[] = [Resources.outcomeField];
  public readonly outcome: DeleteFolderOutcome;

  public constructor(outcome: DeleteFolderOutcome) {
    this.outcome = outcome;
  }

  public static fromJson(value: unknown): DeleteFolderResult {
    const reader = WireForm.read(value, Resources.deleteFolderResultModel, DeleteFolderResult.FIELDS);
    return new DeleteFolderResult(DeleteFolderOutcome.fromJson(reader.readValue(Resources.outcomeField)));
  }

  public toJson(): JsonObject {
    return { [Resources.outcomeField]: this.outcome.toJson() };
  }
}
