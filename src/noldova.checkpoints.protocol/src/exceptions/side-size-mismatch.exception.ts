/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { PathKind } from "../models/path-kind.ts";
import { Resources } from "../resources.ts";
import { ProtocolException } from "./protocol.exception.ts";

export class SideSizeMismatchException extends ProtocolException {
  public readonly kind: PathKind;

  public constructor(kind: PathKind) {
    super(Resources.formatSideSizeMismatch(kind.value));

    this.kind = kind;
  }
}
