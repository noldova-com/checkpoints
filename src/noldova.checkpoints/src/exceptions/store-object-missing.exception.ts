/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { StoreException } from "./store.exception.ts";

export class StoreObjectMissingException extends StoreException {
  public readonly objectId: string;

  public constructor(objectId: string) {
    super(Resources.formatStoreObjectMissing(objectId));

    this.objectId = objectId;
  }
}
