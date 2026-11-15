/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { JsonObjectReader, PathKind, RestoreAction, type JsonObject } from "@noldova/checkpoints.protocol";

import { JournalFieldMissingException } from "../exceptions/journal-field-missing.exception.ts";
import { Resources } from "../resources.ts";
import { LinkKind } from "./link-kind.ts";

export class ScriptStep {
  private static readonly FIELDS: readonly string[] = [
    Resources.indexField, Resources.pathField, Resources.actionField, Resources.stageField, Resources.asideField, Resources.kindField,
    Resources.objectIdField, Resources.linkKindField
  ];
  public readonly action: RestoreAction;
  public readonly aside: string | null;
  public readonly index: number;
  public readonly kind: PathKind | null;
  public readonly linkKind: LinkKind | null;
  public readonly objectId: string | null;
  public readonly path: string;
  public readonly stage: string | null;

  public constructor(
    index: number,
    path: string,
    action: RestoreAction,
    stage: string | null,
    aside: string | null,
    kind: PathKind | null,
    objectId: string | null,
    linkKind: LinkKind | null) {
    this.action = action;
    this.aside = aside;
    this.index = index;
    this.kind = kind;
    this.linkKind = linkKind;
    this.objectId = objectId;
    this.path = path;
    this.stage = stage;
  }

  public static fromJson(value: unknown): ScriptStep {
    const reader = new JsonObjectReader(value, Resources.scriptStepModel);
    reader.refuseOtherFields(ScriptStep.FIELDS);
    const kind = reader.readStringOrNull(Resources.kindField);
    const linkKind = reader.read(Resources.linkKindField);
    return new ScriptStep(
      reader.readNumber(Resources.indexField),
      reader.readString(Resources.pathField),
      RestoreAction.fromJson(reader.read(Resources.actionField)),
      reader.readStringOrNull(Resources.stageField),
      reader.readStringOrNull(Resources.asideField),
      kind === null ? null : PathKind.fromJson(kind),
      reader.readStringOrNull(Resources.objectIdField),
      linkKind === null ? null : LinkKind.fromJson(linkKind));
  }

  public readAside(): string {
    return ScriptStep.required(this.aside, Resources.asideField);
  }

  public readKind(): PathKind {
    return ScriptStep.required(this.kind, Resources.kindField);
  }

  public readObjectId(): string {
    return ScriptStep.required(this.objectId, Resources.objectIdField);
  }

  public readStage(): string {
    return ScriptStep.required(this.stage, Resources.stageField);
  }

  public toJson(): JsonObject {
    return {
      [Resources.indexField]: this.index,
      [Resources.pathField]: this.path,
      [Resources.actionField]: this.action.toJson(),
      [Resources.stageField]: this.stage,
      [Resources.asideField]: this.aside,
      [Resources.kindField]: this.kind === null ? null : this.kind.toJson(),
      [Resources.objectIdField]: this.objectId,
      [Resources.linkKindField]: this.linkKind === null ? null : this.linkKind.toJson()
    };
  }

  private static required<T>(value: T | null, field: string): T {
    if (value === null)
      throw new JournalFieldMissingException(Resources.scriptStepModel, field);
    return value;
  }
}
