/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { ProtocolException } from "./protocol.exception.ts";

export class InvalidTimeException extends ProtocolException {
  public readonly time: string;

  public constructor(time: string) {
    super(Resources.formatInvalidTime(time));

    this.time = time;
  }
}
