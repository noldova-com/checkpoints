/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { RestoreOutcome } from "../models/restore-outcome.ts";
import { Resources } from "../resources.ts";
import { ProtocolException } from "./protocol.exception.ts";

export class RestoreContentMismatchException extends ProtocolException {
  public readonly outcome: RestoreOutcome;

  public constructor(outcome: RestoreOutcome) {
    super(Resources.formatRestoreContentMismatch(outcome.value));

    this.outcome = outcome;
  }
}
