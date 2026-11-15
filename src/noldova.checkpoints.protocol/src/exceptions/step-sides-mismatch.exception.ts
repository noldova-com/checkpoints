/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { RestoreAction } from "../models/restore-action.ts";
import { Resources } from "../resources.ts";
import { ProtocolException } from "./protocol.exception.ts";

export class StepSidesMismatchException extends ProtocolException {
  public readonly action: RestoreAction;

  public constructor(action: RestoreAction) {
    super(Resources.formatStepSidesMismatch(action.value));

    this.action = action;
  }
}
