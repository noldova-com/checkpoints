/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/context.json";

import { InvalidFolderPathException } from "../exceptions/invalid-folder-path.exception.ts";
import { Resources } from "../resources.ts";
import { FolderIdentity } from "../services/folder-identity.ts";
import { WireForm } from "../services/wire-form.ts";

export class FolderReference {
  private static readonly FIELDS: readonly string[] = [Resources.identityField, Resources.pathField];
  public readonly identity: string;
  public readonly path: string;

  public constructor(identity: string, path: string) {
    FolderIdentity.check(identity);
    if (!Resources.absolutePathPattern.test(path))
      throw new InvalidFolderPathException(path);

    this.identity = identity;
    this.path = path;
  }

  public static fromJson(value: unknown): FolderReference {
    const reader = WireForm.read(value, Resources.folderReferenceModel, FolderReference.FIELDS);
    return new FolderReference(reader.readString(Resources.identityField), reader.readString(Resources.pathField));
  }

  public toJson(): JsonObject {
    return { [Resources.identityField]: this.identity, [Resources.pathField]: this.path };
  }
}
