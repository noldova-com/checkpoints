/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { ProtocolException } from "./protocol.exception.ts";

export class ContentTooLongException extends ProtocolException {
  public readonly length: number;
  public readonly size: number;

  public constructor(length: number, size: number) {
    super(Resources.formatContentTooLong(length, size));

    this.length = length;
    this.size = size;
  }
}
