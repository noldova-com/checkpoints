/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "@noldova/context.core";

import { UnknownPreviewOutcomeException } from "../exceptions/unknown-preview-outcome.exception.ts";

export class PreviewOutcome {
  public static readonly Planned: PreviewOutcome = new PreviewOutcome("Planned", true);
  public static readonly CheckpointMissing: PreviewOutcome = new PreviewOutcome("CheckpointMissing", false);
  public static readonly FolderMissing: PreviewOutcome = new PreviewOutcome("FolderMissing", false);
  public static readonly HeldUp: PreviewOutcome = new PreviewOutcome("HeldUp", false);
  private static readonly ALL: readonly PreviewOutcome[] = [
    PreviewOutcome.Planned, PreviewOutcome.CheckpointMissing, PreviewOutcome.FolderMissing, PreviewOutcome.HeldUp
  ];
  public readonly isPlanned: boolean;
  public readonly value: string;

  private constructor(value: string, isPlanned: boolean) {
    this.isPlanned = isPlanned;
    this.value = value;
  }

  public static fromJson(value: unknown): PreviewOutcome {
    const outcome = PreviewOutcome.ALL.find(t => t.value === value);
    if (Object.isUndefined(outcome))
      throw new UnknownPreviewOutcomeException(String(value));
    return outcome;
  }

  public toJson(): string {
    return this.value;
  }
}
