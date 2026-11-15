/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { InvalidPlanStateException } from "../exceptions/invalid-plan-state.exception.ts";
import { Resources } from "../resources.ts";
import { ByteSize } from "../services/byte-size.ts";
import { CheckpointId } from "../services/checkpoint-id.ts";
import { JsonObjectReader } from "../services/json-object.reader.ts";
import { ScopePaths } from "../services/scope-paths.ts";
import type { JsonObject } from "../types/json-object.ts";
import { KeptPath } from "./kept-path.ts";
import { RestoreStep } from "./restore-step.ts";

export class RestorePlan {
  private static readonly FIELDS: readonly string[] = [
    Resources.checkpointField, Resources.stepsField, Resources.staysField, Resources.bytesToWriteField, Resources.spaceNeededField, Resources.stateField,
    Resources.pathsField
  ];
  public readonly bytesToWrite: number;
  public readonly checkpoint: string;
  public readonly paths: readonly string[] | null;
  public readonly spaceNeeded: number;
  public readonly state: string;
  public readonly stays: readonly KeptPath[];
  public readonly steps: readonly RestoreStep[];

  public constructor(
    checkpoint: string, steps: readonly RestoreStep[], stays: readonly KeptPath[], bytesToWrite: number, spaceNeeded: number, state: string,
    paths: readonly string[] | null) {
    CheckpointId.check(checkpoint);
    for (const size of [bytesToWrite, spaceNeeded])
      ByteSize.check(size);
    if (!Resources.stateDigestPattern.test(state))
      throw new InvalidPlanStateException(state);

    this.bytesToWrite = bytesToWrite;
    this.checkpoint = checkpoint;
    this.paths = ScopePaths.of(paths);
    this.spaceNeeded = spaceNeeded;
    this.state = state;
    this.stays = [...stays];
    this.steps = [...steps];
  }

  public static fromJson(value: unknown): RestorePlan {
    const reader = new JsonObjectReader(value, Resources.restorePlanModel);
    reader.refuseOtherFields(RestorePlan.FIELDS);
    return new RestorePlan(
      reader.readString(Resources.checkpointField),
      reader.readList(Resources.stepsField).map(t => RestoreStep.fromJson(t)),
      reader.readList(Resources.staysField).map(t => KeptPath.fromJson(t)),
      reader.readNumber(Resources.bytesToWriteField),
      reader.readNumber(Resources.spaceNeededField),
      reader.readString(Resources.stateField),
      reader.readStringListOrNull(Resources.pathsField));
  }

  public toJson(): JsonObject {
    return {
      [Resources.checkpointField]: this.checkpoint,
      [Resources.stepsField]: this.steps.map(t => t.toJson()),
      [Resources.staysField]: this.stays.map(t => t.toJson()),
      [Resources.bytesToWriteField]: this.bytesToWrite,
      [Resources.spaceNeededField]: this.spaceNeeded,
      [Resources.stateField]: this.state,
      [Resources.pathsField]: ScopePaths.toJson(this.paths)
    };
  }
}
