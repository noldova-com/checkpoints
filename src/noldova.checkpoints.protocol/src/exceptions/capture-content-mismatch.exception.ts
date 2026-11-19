/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { CaptureOutcome } from "../models/capture-outcome.ts";
import { Resources } from "../resources.ts";
import { ProtocolException } from "./protocol.exception.ts";

export class CaptureContentMismatchException extends ProtocolException {
  public readonly outcome: CaptureOutcome;

  public constructor(outcome: CaptureOutcome) {
    super(Resources.formatContentMismatch(outcome.value));

    this.outcome = outcome;
  }
}
