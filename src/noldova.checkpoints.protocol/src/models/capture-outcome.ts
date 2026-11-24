/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "@noldova/context.core";

import { UnknownCaptureOutcomeException } from "../exceptions/unknown-capture-outcome.exception.ts";

export class CaptureOutcome {
  public static readonly Captured: CaptureOutcome = new CaptureOutcome("Captured", true);
  public static readonly FolderMissing: CaptureOutcome = new CaptureOutcome("FolderMissing", false);
  public static readonly HeldUp: CaptureOutcome = new CaptureOutcome("HeldUp", false);
  public static readonly LowDiskSpace: CaptureOutcome = new CaptureOutcome("LowDiskSpace", false);
  public static readonly TooLarge: CaptureOutcome = new CaptureOutcome("TooLarge", false);
  private static readonly ALL: readonly CaptureOutcome[] = [CaptureOutcome.Captured, CaptureOutcome.FolderMissing, CaptureOutcome.HeldUp, CaptureOutcome.LowDiskSpace, CaptureOutcome.TooLarge];
  public readonly isCaptured: boolean;
  public readonly value: string;

  private constructor(value: string, isCaptured: boolean) {
    this.isCaptured = isCaptured;
    this.value = value;
  }

  public static fromJson(value: unknown): CaptureOutcome {
    const outcome = CaptureOutcome.ALL.find(t => t.value === value);
    if (Object.isUndefined(outcome))
      throw new UnknownCaptureOutcomeException(String(value));
    return outcome;
  }

  public toJson(): string {
    return this.value;
  }
}
