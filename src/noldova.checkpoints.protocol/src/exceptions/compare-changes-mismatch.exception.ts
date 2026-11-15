/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { CompareOutcome } from "../models/compare-outcome.ts";
import { Resources } from "../resources.ts";
import { ProtocolException } from "./protocol.exception.ts";

export class CompareChangesMismatchException extends ProtocolException {
  public readonly outcome: CompareOutcome;

  public constructor(outcome: CompareOutcome) {
    super(Resources.formatChangesMismatch(outcome.value));

    this.outcome = outcome;
  }
}
