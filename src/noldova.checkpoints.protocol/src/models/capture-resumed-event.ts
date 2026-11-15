/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/context.json";

import { Resources } from "../resources.ts";
import { FolderIdentity } from "../services/folder-identity.ts";
import { WireForm } from "../services/wire-form.ts";

export class CaptureResumedEvent {
  public static readonly event: string = Resources.captureResumedEvent;
  private static readonly FIELDS: readonly string[] = [Resources.identityField];
  public readonly identity: string;

  public constructor(identity: string) {
    FolderIdentity.check(identity);

    this.identity = identity;
  }

  public static fromJson(value: unknown): CaptureResumedEvent {
    const reader = WireForm.read(value, Resources.captureResumedEventModel, CaptureResumedEvent.FIELDS);
    return new CaptureResumedEvent(reader.readString(Resources.identityField));
  }

  public toJson(): JsonObject {
    return { [Resources.identityField]: this.identity };
  }
}
