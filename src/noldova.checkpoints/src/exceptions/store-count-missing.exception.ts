/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { StoreException } from "./store.exception.ts";

export class StoreCountMissingException extends StoreException {
  public readonly count: string;

  public constructor(count: string) {
    super(Resources.formatStoreCountMissing(count));

    this.count = count;
  }
}
