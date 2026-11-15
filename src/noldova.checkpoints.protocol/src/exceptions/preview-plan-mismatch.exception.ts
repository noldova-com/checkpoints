/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { PreviewOutcome } from "../models/preview-outcome.ts";
import { Resources } from "../resources.ts";
import { ProtocolException } from "./protocol.exception.ts";

export class PreviewPlanMismatchException extends ProtocolException {
  public readonly outcome: PreviewOutcome;

  public constructor(outcome: PreviewOutcome) {
    super(Resources.formatPlanMismatch(outcome.value));

    this.outcome = outcome;
  }
}
