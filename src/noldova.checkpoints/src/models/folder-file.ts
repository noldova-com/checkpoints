/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { EntryKind } from "./entry-kind.ts";
import { SideFile } from "./side-file.ts";

export class FolderFile extends SideFile {
  public readonly fileId: string;
  public readonly location: string;
  public readonly size: number;

  public constructor(kind: EntryKind, objectId: string, location: string, size: number, fileId: string) {
    super(kind, objectId);

    this.fileId = fileId;
    this.location = location;
    this.size = size;
  }
}
