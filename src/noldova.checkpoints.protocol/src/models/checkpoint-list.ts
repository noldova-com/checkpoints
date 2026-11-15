/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { JsonObjectReader } from "../services/json-object.reader.ts";
import type { JsonObject } from "../types/json-object.ts";
import { Checkpoint } from "./checkpoint.ts";

export class CheckpointList {
  private static readonly FIELDS: readonly string[] = [Resources.checkpointsField];
  public readonly checkpoints: readonly Checkpoint[];

  public constructor(checkpoints: readonly Checkpoint[]) {
    this.checkpoints = [...checkpoints];
  }

  public static fromJson(value: unknown): CheckpointList {
    const reader = new JsonObjectReader(value, Resources.checkpointListModel);
    reader.refuseOtherFields(CheckpointList.FIELDS);
    return new CheckpointList(reader.readList(Resources.checkpointsField).map(t => Checkpoint.fromJson(t)));
  }

  public toJson(): JsonObject {
    return { [Resources.checkpointsField]: this.checkpoints.map(t => t.toJson()) };
  }
}
