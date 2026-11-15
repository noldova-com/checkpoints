/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/context.json";

import { CompareChangesMismatchException } from "../exceptions/compare-changes-mismatch.exception.ts";
import { Resources } from "../resources.ts";
import { WireForm } from "../services/wire-form.ts";
import { Change } from "./change.ts";
import { CompareOutcome } from "./compare-outcome.ts";

export class CompareResult {
  private static readonly FIELDS: readonly string[] = [Resources.outcomeField, Resources.changesField];
  public readonly changes: readonly Change[];
  public readonly outcome: CompareOutcome;

  public constructor(outcome: CompareOutcome, changes: readonly Change[]) {
    if (!outcome.isCompared && changes.length > 0)
      throw new CompareChangesMismatchException(outcome);

    this.changes = [...changes];
    this.outcome = outcome;
  }

  public static fromJson(value: unknown): CompareResult {
    const reader = WireForm.read(value, Resources.compareResultModel, CompareResult.FIELDS);
    return new CompareResult(CompareOutcome.fromJson(reader.readValue(Resources.outcomeField)), WireForm.readArray(reader, Resources.changesField).map(t => Change.fromJson(t)));
  }

  public toJson(): JsonObject {
    return { [Resources.outcomeField]: this.outcome.toJson(), [Resources.changesField]: this.changes.map(t => t.toJson()) };
  }
}
