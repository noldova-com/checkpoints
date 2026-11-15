/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { StoreException } from "./store.exception.ts";

export class UnexpectedStoreObjectException extends StoreException {
  public readonly header: string;

  public constructor(header: string) {
    super(Resources.formatUnexpectedStoreObject(header));

    this.header = header;
  }
}
