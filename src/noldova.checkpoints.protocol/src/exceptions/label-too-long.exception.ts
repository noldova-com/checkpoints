/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { ProtocolException } from "./protocol.exception.ts";

export class LabelTooLongException extends ProtocolException {
  public readonly length: number;

  public constructor(length: number) {
    super(Resources.formatLabelTooLong(length));

    this.length = length;
  }
}
