/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { PathKind } from "@noldova/checkpoints.protocol";

import type { LinkKind } from "./link-kind.ts";

export class StagedBlob {
  public readonly kind: PathKind;
  public readonly linkKind: LinkKind | null;
  public readonly location: string;
  public readonly objectId: string;

  public constructor(objectId: string, location: string, kind: PathKind, linkKind: LinkKind | null) {
    this.kind = kind;
    this.linkKind = linkKind;
    this.location = location;
    this.objectId = objectId;
  }
}
