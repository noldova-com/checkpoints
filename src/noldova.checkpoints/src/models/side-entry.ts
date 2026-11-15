/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { PathKind } from "@noldova/checkpoints.protocol";

export abstract class SideEntry {
  public readonly kind: PathKind;

  protected constructor(kind: PathKind) {
    this.kind = kind;
  }

  public abstract isSameAs(other: SideEntry): boolean;

  public isOtherKindThan(other: SideEntry): boolean {
    return SideEntry.classOf(this.kind) !== SideEntry.classOf(other.kind);
  }

  private static classOf(kind: PathKind): PathKind {
    return kind === PathKind.Executable ? PathKind.File : kind;
  }
}
