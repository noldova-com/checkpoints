/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { CaptureCheckpointMismatchException } from "../exceptions/capture-checkpoint-mismatch.exception.ts";
import { CaptureSpaceMismatchException } from "../exceptions/capture-space-mismatch.exception.ts";
import { Resources } from "../resources.ts";
import { ByteSize } from "../services/byte-size.ts";
import { JsonObjectReader } from "../services/json-object.reader.ts";
import type { JsonObject } from "../types/json-object.ts";
import { CaptureOutcome } from "./capture-outcome.ts";
import { Checkpoint } from "./checkpoint.ts";

export class CaptureResult {
  private static readonly FIELDS: readonly string[] = [Resources.outcomeField, Resources.checkpointField, Resources.spaceFreeField, Resources.spaceNeededField];
  public readonly checkpoint: Checkpoint | null;
  public readonly outcome: CaptureOutcome;
  public readonly spaceFree: number | null;
  public readonly spaceNeeded: number | null;

  public constructor(outcome: CaptureOutcome, checkpoint: Checkpoint | null, spaceFree: number | null, spaceNeeded: number | null) {
    if (outcome.isCaptured !== (checkpoint !== null))
      throw new CaptureCheckpointMismatchException(outcome);
    const sizes = [spaceFree, spaceNeeded];
    if (sizes.some(t => (t !== null) !== (outcome === CaptureOutcome.LowDiskSpace)))
      throw new CaptureSpaceMismatchException(outcome);
    for (const size of sizes)
      if (size !== null)
        ByteSize.check(size);

    this.checkpoint = checkpoint;
    this.outcome = outcome;
    this.spaceFree = spaceFree;
    this.spaceNeeded = spaceNeeded;
  }

  public static fromJson(value: unknown): CaptureResult {
    const reader = new JsonObjectReader(value, Resources.captureResultModel);
    reader.refuseOtherFields(CaptureResult.FIELDS);
    const checkpoint = reader.read(Resources.checkpointField);
    return new CaptureResult(CaptureOutcome.fromJson(reader.read(Resources.outcomeField)), checkpoint === null ? null : Checkpoint.fromJson(checkpoint),
      reader.readNumberOrNull(Resources.spaceFreeField), reader.readNumberOrNull(Resources.spaceNeededField));
  }

  public toJson(): JsonObject {
    return {
      [Resources.outcomeField]: this.outcome.toJson(),
      [Resources.checkpointField]: this.checkpoint === null ? null : this.checkpoint.toJson(),
      [Resources.spaceFreeField]: this.spaceFree,
      [Resources.spaceNeededField]: this.spaceNeeded
    };
  }
}
