/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/context.json";

import { Resources } from "../resources.ts";
import { WireForm } from "../services/wire-form.ts";
import { Checkpoint } from "./checkpoint.ts";

export class CheckpointList {
  private static readonly FIELDS: readonly string[] = [Resources.checkpointsField];
  public readonly checkpoints: readonly Checkpoint[];

  public constructor(checkpoints: readonly Checkpoint[]) {
    this.checkpoints = [...checkpoints];
  }

  public static fromJson(value: unknown): CheckpointList {
    const reader = WireForm.read(value, Resources.checkpointListModel, CheckpointList.FIELDS);
    return new CheckpointList(WireForm.readArray(reader, Resources.checkpointsField).map(t => Checkpoint.fromJson(t)));
  }

  public toJson(): JsonObject {
    return { [Resources.checkpointsField]: this.checkpoints.map(t => t.toJson()) };
  }
}
