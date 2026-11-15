/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/context.json";

import { RestoreCheckpointsMismatchException } from "../exceptions/restore-checkpoints-mismatch.exception.ts";
import { Resources } from "../resources.ts";
import { WireForm } from "../services/wire-form.ts";
import { Checkpoint } from "./checkpoint.ts";
import { RestoreOutcome } from "./restore-outcome.ts";

export class RestoreResult {
  private static readonly FIELDS: readonly string[] = [Resources.outcomeField, Resources.beforeField, Resources.recoveredField];
  public readonly before: Checkpoint | null;
  public readonly outcome: RestoreOutcome;
  public readonly recovered: Checkpoint | null;

  public constructor(outcome: RestoreOutcome, before: Checkpoint | null, recovered: Checkpoint | null) {
    if ((before !== null) !== (outcome.isRestored || outcome === RestoreOutcome.RolledBack) || recovered !== null && !outcome.isRestored)
      throw new RestoreCheckpointsMismatchException(outcome);

    this.before = before;
    this.outcome = outcome;
    this.recovered = recovered;
  }

  public static fromJson(value: unknown): RestoreResult {
    const reader = WireForm.read(value, Resources.restoreResultModel, RestoreResult.FIELDS);
    const before = reader.readValue(Resources.beforeField);
    const recovered = reader.readValue(Resources.recoveredField);
    return new RestoreResult(
      RestoreOutcome.fromJson(reader.readValue(Resources.outcomeField)),
      before === null ? null : Checkpoint.fromJson(before),
      recovered === null ? null : Checkpoint.fromJson(recovered));
  }

  public toJson(): JsonObject {
    return {
      [Resources.outcomeField]: this.outcome.toJson(),
      [Resources.beforeField]: this.before === null ? null : this.before.toJson(),
      [Resources.recoveredField]: this.recovered === null ? null : this.recovered.toJson()
    };
  }
}
