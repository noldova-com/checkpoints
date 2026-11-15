/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/context.json";

import { InvalidRelativePathException } from "../exceptions/invalid-relative-path.exception.ts";
import { Resources } from "../resources.ts";
import { FolderIdentity } from "../services/folder-identity.ts";
import { RelativePath } from "../services/relative-path.ts";
import { WireForm } from "../services/wire-form.ts";

export class RestoreHeldUpEvent {
  public static readonly event: string = Resources.restoreHeldUpEvent;
  private static readonly FIELDS: readonly string[] = [Resources.identityField, Resources.pathsField];
  public readonly identity: string;
  public readonly paths: readonly string[];

  public constructor(identity: string, paths: readonly string[]) {
    FolderIdentity.check(identity);
    for (const path of paths)
      if (!RelativePath.isValid(path))
        throw new InvalidRelativePathException(path);

    this.identity = identity;
    this.paths = [...paths];
  }

  public static fromJson(value: unknown): RestoreHeldUpEvent {
    const reader = WireForm.read(value, Resources.restoreHeldUpEventModel, RestoreHeldUpEvent.FIELDS);
    return new RestoreHeldUpEvent(reader.readString(Resources.identityField), reader.readStringArray(Resources.pathsField));
  }

  public toJson(): JsonObject {
    return { [Resources.identityField]: this.identity, [Resources.pathsField]: [...this.paths] };
  }
}
