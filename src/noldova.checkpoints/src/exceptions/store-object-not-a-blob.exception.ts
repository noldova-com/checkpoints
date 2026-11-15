/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { StoreException } from "./store.exception.ts";

export class StoreObjectNotABlobException extends StoreException {
  public readonly header: string;
  public readonly objectId: string;

  public constructor(objectId: string, header: string) {
    super(Resources.formatStoreObjectNotABlob(objectId, header));

    this.header = header;
    this.objectId = objectId;
  }
}
