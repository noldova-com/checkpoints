/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { ProtocolException } from "./protocol.exception.ts";

export class InvalidSizeException extends ProtocolException {
  public readonly size: number;

  public constructor(size: number) {
    super(Resources.formatInvalidSize(size));

    this.size = size;
  }
}
