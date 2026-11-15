/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ExceptionOptions } from "@noldova/context.exceptions";

import { Resources } from "../resources.ts";
import { RestoreStepException } from "./restore-step.exception.ts";

export class RestoreStepFailedException extends RestoreStepException {
  public override readonly path: string;

  public constructor(path: string, cause: Error) {
    super(Resources.formatStepFailed(path, cause.message), new ExceptionOptions(cause));

    this.path = path;
  }
}
