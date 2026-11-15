/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { CaptureMode } from "@noldova/checkpoints.protocol";

import { Resources } from "../resources.ts";
import { StoreException } from "./store.exception.ts";

export class IgnoreRulesMismatchException extends StoreException {
  public readonly mode: CaptureMode;

  public constructor(mode: CaptureMode) {
    super(Resources.formatIgnoreRulesMismatch(mode.value));

    this.mode = mode;
  }
}
