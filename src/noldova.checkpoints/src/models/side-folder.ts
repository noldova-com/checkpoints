/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { PathKind } from "@noldova/checkpoints.protocol";

import { SideEntry } from "./side-entry.ts";

export class SideFolder extends SideEntry {
  public static readonly Instance: SideFolder = new SideFolder();

  private constructor() {
    super(PathKind.Folder);
  }

  public override isSameAs(other: SideEntry): boolean {
    return other instanceof SideFolder;
  }
}
