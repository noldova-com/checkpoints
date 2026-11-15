/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { CheckpointId } from "../services/checkpoint-id.ts";
import { JsonObjectReader } from "../services/json-object.reader.ts";
import type { JsonObject } from "../types/json-object.ts";

export class DiffTarget {
  private static readonly FIELDS: readonly string[] = [Resources.checkpointField];
  public readonly checkpoint: string | null;

  public constructor(checkpoint: string | null) {
    if (checkpoint !== null)
      CheckpointId.check(checkpoint);

    this.checkpoint = checkpoint;
  }

  public static fromJson(value: unknown): DiffTarget {
    const reader = new JsonObjectReader(value, Resources.diffTargetModel);
    reader.refuseOtherFields(DiffTarget.FIELDS);
    return new DiffTarget(reader.readStringOrNull(Resources.checkpointField));
  }

  public toJson(): JsonObject {
    return { [Resources.checkpointField]: this.checkpoint };
  }
}
