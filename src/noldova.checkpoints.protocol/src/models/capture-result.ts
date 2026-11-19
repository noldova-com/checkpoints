/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/context.json";

import { CaptureCheckpointMismatchException } from "../exceptions/capture-checkpoint-mismatch.exception.ts";
import { CaptureContentMismatchException } from "../exceptions/capture-content-mismatch.exception.ts";
import { CaptureSpaceMismatchException } from "../exceptions/capture-space-mismatch.exception.ts";
import { Resources } from "../resources.ts";
import { ByteSize } from "../services/byte-size.ts";
import { WireForm } from "../services/wire-form.ts";
import { CaptureOutcome } from "./capture-outcome.ts";
import { Checkpoint } from "./checkpoint.ts";

export class CaptureResult {
  private static readonly FIELDS: readonly string[] = [
    Resources.outcomeField, Resources.checkpointField, Resources.spaceFreeField, Resources.spaceNeededField, Resources.contentSizeField,
    Resources.contentLimitField
  ];
  public readonly checkpoint: Checkpoint | null;
  public readonly contentLimit: number | null;
  public readonly contentSize: number | null;
  public readonly outcome: CaptureOutcome;
  public readonly spaceFree: number | null;
  public readonly spaceNeeded: number | null;

  public constructor(
    outcome: CaptureOutcome, checkpoint: Checkpoint | null, spaceFree: number | null, spaceNeeded: number | null,
    contentSize: number | null = null, contentLimit: number | null = null) {
    if (outcome.isCaptured !== (checkpoint !== null))
      throw new CaptureCheckpointMismatchException(outcome);
    const sizes = [spaceFree, spaceNeeded];
    if (sizes.some(t => (t !== null) !== (outcome === CaptureOutcome.LowDiskSpace)))
      throw new CaptureSpaceMismatchException(outcome);
    const contents = [contentSize, contentLimit];
    if (contents.some(t => (t !== null) !== (outcome === CaptureOutcome.TooLarge)))
      throw new CaptureContentMismatchException(outcome);
    for (const size of [...sizes, ...contents])
      if (size !== null)
        ByteSize.check(size);

    this.checkpoint = checkpoint;
    this.contentLimit = contentLimit;
    this.contentSize = contentSize;
    this.outcome = outcome;
    this.spaceFree = spaceFree;
    this.spaceNeeded = spaceNeeded;
  }

  public static fromJson(value: unknown): CaptureResult {
    const reader = WireForm.read(value, Resources.captureResultModel, CaptureResult.FIELDS);
    const checkpoint = reader.readValue(Resources.checkpointField);
    return new CaptureResult(CaptureOutcome.fromJson(reader.readValue(Resources.outcomeField)), checkpoint === null ? null : Checkpoint.fromJson(checkpoint),
      WireForm.readNullableNumber(reader, Resources.spaceFreeField), WireForm.readNullableNumber(reader, Resources.spaceNeededField),
      WireForm.readNullableNumber(reader, Resources.contentSizeField), WireForm.readNullableNumber(reader, Resources.contentLimitField));
  }

  public toJson(): JsonObject {
    return {
      [Resources.outcomeField]: this.outcome.toJson(),
      [Resources.checkpointField]: this.checkpoint === null ? null : this.checkpoint.toJson(),
      [Resources.spaceFreeField]: this.spaceFree,
      [Resources.spaceNeededField]: this.spaceNeeded,
      [Resources.contentSizeField]: this.contentSize,
      [Resources.contentLimitField]: this.contentLimit
    };
  }
}
