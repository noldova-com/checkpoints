/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { PreviewPlanMismatchException } from "../exceptions/preview-plan-mismatch.exception.ts";
import { Resources } from "../resources.ts";
import { JsonObjectReader } from "../services/json-object.reader.ts";
import type { JsonObject } from "../types/json-object.ts";
import { PreviewOutcome } from "./preview-outcome.ts";
import { RestorePlan } from "./restore-plan.ts";

export class PreviewResult {
  private static readonly FIELDS: readonly string[] = [Resources.outcomeField, Resources.planField];
  public readonly outcome: PreviewOutcome;
  public readonly plan: RestorePlan | null;

  public constructor(outcome: PreviewOutcome, plan: RestorePlan | null) {
    if (outcome.isPlanned !== (plan !== null))
      throw new PreviewPlanMismatchException(outcome);

    this.outcome = outcome;
    this.plan = plan;
  }

  public static fromJson(value: unknown): PreviewResult {
    const reader = new JsonObjectReader(value, Resources.previewResultModel);
    reader.refuseOtherFields(PreviewResult.FIELDS);
    const plan = reader.read(Resources.planField);
    return new PreviewResult(PreviewOutcome.fromJson(reader.read(Resources.outcomeField)), plan === null ? null : RestorePlan.fromJson(plan));
  }

  public toJson(): JsonObject {
    return { [Resources.outcomeField]: this.outcome.toJson(), [Resources.planField]: this.plan === null ? null : this.plan.toJson() };
  }
}
