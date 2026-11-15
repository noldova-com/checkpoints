/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { StoreException } from "./store.exception.ts";

export class UnsupportedStoreFormatException extends StoreException {
  public readonly version: string;

  public constructor(version: string) {
    super(Resources.formatUnsupportedFormat(version));

    this.version = version;
  }
}
