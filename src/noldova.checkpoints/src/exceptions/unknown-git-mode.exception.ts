/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { StoreException } from "./store.exception.ts";

export class UnknownGitModeException extends StoreException {
  public readonly mode: string;

  public constructor(mode: string) {
    super(Resources.formatUnreadableStore(Resources.checkpointTree, Resources.formatUnknownGitMode(mode)));

    this.mode = mode;
  }
}
