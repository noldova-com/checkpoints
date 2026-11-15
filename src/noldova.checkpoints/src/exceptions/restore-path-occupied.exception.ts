/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { RestoreStepException } from "./restore-step.exception.ts";

export class RestorePathOccupiedException extends RestoreStepException {
  public override readonly path: string;

  public constructor(path: string) {
    super(Resources.formatStepFailed(path, Resources.occupiedReason));

    this.path = path;
  }
}
