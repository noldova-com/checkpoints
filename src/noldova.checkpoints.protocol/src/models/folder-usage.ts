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
import { ByteSize } from "../services/byte-size.ts";
import { FolderIdentity } from "../services/folder-identity.ts";
import { WireForm } from "../services/wire-form.ts";

export class FolderUsage {
  private static readonly FIELDS: readonly string[] = [Resources.identityField, Resources.pathField, Resources.bytesField];
  public readonly bytes: number;
  public readonly identity: string;
  public readonly path: string | null;

  public constructor(identity: string, path: string | null, bytes: number) {
    FolderIdentity.check(identity);
    if (path !== null && !Resources.absolutePathPattern.test(path))
      throw new InvalidFolderPathException(path);
    ByteSize.check(bytes);

    this.bytes = bytes;
    this.identity = identity;
    this.path = path;
  }

  public static fromJson(value: unknown): FolderUsage {
    const reader = WireForm.read(value, Resources.folderUsageModel, FolderUsage.FIELDS);
    return new FolderUsage(reader.readString(Resources.identityField), reader.readNullableString(Resources.pathField), reader.readNumber(Resources.bytesField));
  }

  public toJson(): JsonObject {
    return { [Resources.identityField]: this.identity, [Resources.pathField]: this.path, [Resources.bytesField]: this.bytes };
  }
}
