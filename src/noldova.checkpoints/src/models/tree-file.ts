/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { EntryKind } from "./entry-kind.ts";
import { SideFile } from "./side-file.ts";

export class TreeFile extends SideFile {
  public constructor(kind: EntryKind, objectId: string) {
    super(kind, objectId);
  }
}
