/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "@noldova/context.core";
import type { JsonObject } from "@noldova/context.json";

import { PreviewPlanMismatchException } from "../exceptions/preview-plan-mismatch.exception.ts";
import { Resources } from "../resources.ts";
import { WireForm } from "../services/wire-form.ts";
import { PreviewOutcome } from "./preview-outcome.ts";
import { RestorePlan } from "./restore-plan.ts";

export class PreviewResult {
  private static readonly FIELDS: readonly string[] = [Resources.outcomeField, Resources.planField];
  public readonly outcome: PreviewOutcome;
  public readonly plan: RestorePlan | null;

  public constructor(outcome: PreviewOutcome, plan: RestorePlan | null) {
    if (outcome.isPlanned !== (!Object.isNull(plan)))
      throw new PreviewPlanMismatchException(outcome);

    this.outcome = outcome;
    this.plan = plan;
  }

  public static fromJson(value: unknown): PreviewResult {
    const reader = WireForm.read(value, Resources.previewResultModel, PreviewResult.FIELDS);
    const plan = reader.readValue(Resources.planField);
    return new PreviewResult(PreviewOutcome.fromJson(reader.readValue(Resources.outcomeField)), Object.isNull(plan) ? null : RestorePlan.fromJson(plan));
  }

  public toJson(): JsonObject {
    return { [Resources.outcomeField]: this.outcome.toJson(), [Resources.planField]: Object.isNull(this.plan) ? null : this.plan.toJson() };
  }
}
