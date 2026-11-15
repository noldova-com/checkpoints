/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { JsonObjectReader, RestoreAction, type JsonObject } from "@noldova/checkpoints.protocol";

import { ScriptStepMissingException } from "../exceptions/script-step-missing.exception.ts";
import { StoreFieldNotAStringListException } from "../exceptions/store-field-not-a-string-list.exception.ts";
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
    const reader = new JsonObjectReader(value, Resources.restoreScriptModel);
    reader.refuseOtherFields(RestoreScript.FIELDS);
    StoreFormat.check(reader);
    const folders = RestoreScript.textsOf(reader.read(Resources.foldersField));
    if (folders === null)
      throw new StoreFieldNotAStringListException(Resources.foldersField);
    return new RestoreScript(
      reader.readString(Resources.restoreIdField),
      reader.readString(Resources.checkpointField),
      reader.readString(Resources.beforeField),
      reader.readList(Resources.stepsField).map(t => ScriptStep.fromJson(t)),
      StoreFormat.readStringList(reader, Resources.createField),
      StoreFormat.readStringList(reader, Resources.removeField),
      folders);
  }

  public stepAt(index: number): ScriptStep {
    const step = this.steps[index];
    if (step === undefined)
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

  private static textsOf(value: unknown): ReadonlyMap<string, string> | null {
    if (typeof value !== "object" || value === null || Array.isArray(value))
      return null;
    const entries: readonly (readonly [string, unknown])[] = Object.entries(value);
    const texts = new Map<string, string>();
    for (const [key, text] of entries) {
      if (typeof text !== "string")
        return null;
      texts.set(key, text);
    }
    return texts;
  }
}
