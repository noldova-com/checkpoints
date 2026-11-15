/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/context.json";

import { Resources } from "../resources.ts";
import { ByteSize } from "../services/byte-size.ts";
import { FolderIdentity } from "../services/folder-identity.ts";
import { WireForm } from "../services/wire-form.ts";

export class CapturePausedEvent {
  public static readonly event: string = Resources.capturePausedEvent;
  private static readonly FIELDS: readonly string[] = [Resources.identityField, Resources.spaceFreeField, Resources.spaceNeededField];
  public readonly identity: string;
  public readonly spaceFree: number;
  public readonly spaceNeeded: number;

  public constructor(identity: string, spaceFree: number, spaceNeeded: number) {
    FolderIdentity.check(identity);
    for (const size of [spaceFree, spaceNeeded])
      ByteSize.check(size);

    this.identity = identity;
    this.spaceFree = spaceFree;
    this.spaceNeeded = spaceNeeded;
  }

  public static fromJson(value: unknown): CapturePausedEvent {
    const reader = WireForm.read(value, Resources.capturePausedEventModel, CapturePausedEvent.FIELDS);
    return new CapturePausedEvent(reader.readString(Resources.identityField), reader.readNumber(Resources.spaceFreeField), reader.readNumber(Resources.spaceNeededField));
  }

  public toJson(): JsonObject {
    return { [Resources.identityField]: this.identity, [Resources.spaceFreeField]: this.spaceFree, [Resources.spaceNeededField]: this.spaceNeeded };
  }
}
