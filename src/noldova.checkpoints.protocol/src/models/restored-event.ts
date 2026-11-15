/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { CheckpointId } from "../services/checkpoint-id.ts";
import { FolderIdentity } from "../services/folder-identity.ts";
import { JsonObjectReader } from "../services/json-object.reader.ts";
import type { JsonObject } from "../types/json-object.ts";

export class RestoredEvent {
  public static readonly event: string = Resources.restoredEvent;
  private static readonly FIELDS: readonly string[] = [Resources.identityField, Resources.checkpointField, Resources.beforeField];
  public readonly before: string;
  public readonly checkpoint: string;
  public readonly identity: string;

  public constructor(identity: string, checkpoint: string, before: string) {
    FolderIdentity.check(identity);
    for (const id of [checkpoint, before])
      CheckpointId.check(id);

    this.before = before;
    this.checkpoint = checkpoint;
    this.identity = identity;
  }

  public static fromJson(value: unknown): RestoredEvent {
    const reader = new JsonObjectReader(value, Resources.restoredEventModel);
    reader.refuseOtherFields(RestoredEvent.FIELDS);
    return new RestoredEvent(reader.readString(Resources.identityField), reader.readString(Resources.checkpointField), reader.readString(Resources.beforeField));
  }

  public toJson(): JsonObject {
    return { [Resources.identityField]: this.identity, [Resources.checkpointField]: this.checkpoint, [Resources.beforeField]: this.before };
  }
}
