/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { UnknownCompareOutcomeException } from "../exceptions/unknown-compare-outcome.exception.ts";

export class CompareOutcome {
  public static readonly Compared: CompareOutcome = new CompareOutcome("Compared", true);
  public static readonly FolderMissing: CompareOutcome = new CompareOutcome("FolderMissing", false);
  public static readonly CheckpointMissing: CompareOutcome = new CompareOutcome("CheckpointMissing", false);
  private static readonly ALL: readonly CompareOutcome[] = [CompareOutcome.Compared, CompareOutcome.FolderMissing, CompareOutcome.CheckpointMissing];
  public readonly isCompared: boolean;
  public readonly value: string;

  private constructor(value: string, isCompared: boolean) {
    this.isCompared = isCompared;
    this.value = value;
  }

  public static fromJson(value: unknown): CompareOutcome {
    const outcome = CompareOutcome.ALL.find(t => t.value === value);
    if (outcome === undefined)
      throw new UnknownCompareOutcomeException(String(value));
    return outcome;
  }

  public toJson(): string {
    return this.value;
  }
}
