/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { EntryKind } from "./entry-kind.ts";
import { SideEntry } from "./side-entry.ts";

export abstract class SideFile extends SideEntry {
  public readonly objectId: string;

  protected constructor(kind: EntryKind, objectId: string) {
    super(kind.pathKind);

    this.objectId = objectId;
  }

  public override isSameAs(other: SideEntry): boolean {
    return other instanceof SideFile && this.kind === other.kind && this.objectId === other.objectId;
  }
}
