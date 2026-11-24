/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "@noldova/context.core";
import type { JsonObject } from "@noldova/context.json";

import { Resources } from "../resources.ts";
import { CheckpointId } from "../services/checkpoint-id.ts";
import { WireForm } from "../services/wire-form.ts";

export class DiffTarget {
  private static readonly FIELDS: readonly string[] = [Resources.checkpointField];
  public readonly checkpoint: string | null;

  public constructor(checkpoint: string | null) {
    if (!Object.isNull(checkpoint))
      CheckpointId.check(checkpoint);

    this.checkpoint = checkpoint;
  }

  public static fromJson(value: unknown): DiffTarget {
    const reader = WireForm.read(value, Resources.diffTargetModel, DiffTarget.FIELDS);
    return new DiffTarget(reader.readNullableString(Resources.checkpointField));
  }

  public toJson(): JsonObject {
    return { [Resources.checkpointField]: this.checkpoint };
  }
}
