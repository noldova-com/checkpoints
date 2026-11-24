/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "@noldova/context.core";
import { RestoreAction } from "@noldova/checkpoints.protocol";
import type { JsonObject } from "@noldova/context.json";

import { ScriptStepMissingException } from "../exceptions/script-step-missing.exception.ts";
import { Resources } from "../resources.ts";
import { StoreFormat } from "../services/store-format.ts";
import { ScriptStep } from "./script-step.ts";

export class RestoreScript {
  private static readonly FIELDS: readonly string[] = [
    Resources.formatVersionField, Resources.restoreIdField, Resources.checkpointField, Resources.beforeField,
    Resources.stepsField, Resources.createField, Resources.removeField, Resources.foldersField
  ];
  public readonly before: string;
  public readonly checkpoint: string;
  public readonly create: readonly string[];
  public readonly folders: ReadonlyMap<string, string>;
  public readonly remove: readonly string[];
  public readonly restoreId: string;
  public readonly steps: readonly ScriptStep[];

  public constructor(
    restoreId: string,
    checkpoint: string,
    before: string,
    steps: readonly ScriptStep[],
    create: readonly string[],
    remove: readonly string[],
    folders: ReadonlyMap<string, string>) {
    this.before = before;
    this.checkpoint = checkpoint;
    this.create = [...create];
    this.folders = new Map(folders);
    this.remove = [...remove];
    this.restoreId = restoreId;
    this.steps = [...steps];
  }

  public get asideOrder(): readonly ScriptStep[] {
    const depth = (step: ScriptStep): number => step.path.split(Resources.relativePathSeparator).length;
    return this.steps.filter(t => t.action !== RestoreAction.Write).sort((t, u) => depth(u) - depth(t) || t.index - u.index);
  }

  public get staging(): string {
    return `${Resources.stagingPrefix}${this.restoreId}`;
  }

  public static fromJson(value: unknown): RestoreScript {
    const reader = StoreFormat.read(value, Resources.restoreScriptModel, RestoreScript.FIELDS);
    StoreFormat.check(reader);
    const folders = reader.readObject(Resources.foldersField);
    return new RestoreScript(
      reader.readString(Resources.restoreIdField),
      reader.readString(Resources.checkpointField),
      reader.readString(Resources.beforeField),
      StoreFormat.readArray(reader, Resources.stepsField).map(t => ScriptStep.fromJson(t)),
      reader.readStringArray(Resources.createField),
      reader.readStringArray(Resources.removeField),
      new Map(Object.keys(folders.toJson()).map(t => [t, folders.readString(t)])));
  }

  public stepAt(index: number): ScriptStep {
    const step = this.steps[index];
    if (Object.isUndefined(step))
      throw new ScriptStepMissingException(index);
    return step;
  }

  public toJson(): JsonObject {
    return {
      [Resources.formatVersionField]: Resources.formatVersion,
      [Resources.restoreIdField]: this.restoreId,
      [Resources.checkpointField]: this.checkpoint,
      [Resources.beforeField]: this.before,
      [Resources.stepsField]: this.steps.map(t => t.toJson()),
      [Resources.createField]: [...this.create],
      [Resources.removeField]: [...this.remove],
      [Resources.foldersField]: Object.fromEntries(this.folders)
    };
  }
}
