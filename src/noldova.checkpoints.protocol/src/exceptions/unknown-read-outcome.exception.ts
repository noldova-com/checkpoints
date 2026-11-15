/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { ProtocolException } from "./protocol.exception.ts";

export class UnknownReadOutcomeException extends ProtocolException {
  public readonly value: string;

  public constructor(value: string) {
    super(Resources.formatUnknownReadOutcome(value));

    this.value = value;
  }
}
