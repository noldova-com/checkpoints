/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { StoreException } from "./store.exception.ts";

export class ScriptStepMissingException extends StoreException {
  public readonly step: number;

  public constructor(step: number) {
    super(Resources.formatUnreadableStore(Resources.restoreFile, Resources.formatScriptStepMissing(step)));

    this.step = step;
  }
}
