/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { ProtocolException } from "./protocol.exception.ts";

export class InvalidReadLimitException extends ProtocolException {
  public readonly limit: number;

  public constructor(limit: number) {
    super(Resources.formatInvalidReadLimit(limit));

    this.limit = limit;
  }
}
