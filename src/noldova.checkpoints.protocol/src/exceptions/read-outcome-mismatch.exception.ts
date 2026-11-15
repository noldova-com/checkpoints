/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { ReadOutcome } from "../models/read-outcome.ts";
import { Resources } from "../resources.ts";
import { ProtocolException } from "./protocol.exception.ts";

export class ReadOutcomeMismatchException extends ProtocolException {
  public readonly outcome: ReadOutcome;

  public constructor(outcome: ReadOutcome) {
    super(Resources.formatReadMismatch(outcome.value));

    this.outcome = outcome;
  }
}
