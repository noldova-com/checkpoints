/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { JsonObjectReader } from "../services/json-object.reader.ts";
import type { JsonObject } from "../types/json-object.ts";
import { DeleteFolderOutcome } from "./delete-folder-outcome.ts";

export class DeleteFolderResult {
  private static readonly FIELDS: readonly string[] = [Resources.outcomeField];
  public readonly outcome: DeleteFolderOutcome;

  public constructor(outcome: DeleteFolderOutcome) {
    this.outcome = outcome;
  }

  public static fromJson(value: unknown): DeleteFolderResult {
    const reader = new JsonObjectReader(value, Resources.deleteFolderResultModel);
    reader.refuseOtherFields(DeleteFolderResult.FIELDS);
    return new DeleteFolderResult(DeleteFolderOutcome.fromJson(reader.read(Resources.outcomeField)));
  }

  public toJson(): JsonObject {
    return { [Resources.outcomeField]: this.outcome.toJson() };
  }
}
