/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { CompareChangesMismatchException } from "../exceptions/compare-changes-mismatch.exception.ts";
import { Resources } from "../resources.ts";
import { JsonObjectReader } from "../services/json-object.reader.ts";
import type { JsonObject } from "../types/json-object.ts";
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
    const reader = new JsonObjectReader(value, Resources.compareResultModel);
    reader.refuseOtherFields(CompareResult.FIELDS);
    return new CompareResult(CompareOutcome.fromJson(reader.read(Resources.outcomeField)), reader.readList(Resources.changesField).map(t => Change.fromJson(t)));
  }

  public toJson(): JsonObject {
    return { [Resources.outcomeField]: this.outcome.toJson(), [Resources.changesField]: this.changes.map(t => t.toJson()) };
  }
}
