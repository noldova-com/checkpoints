/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { StoreException } from "./store.exception.ts";

export class UnknownJournalRecordException extends StoreException {
  public readonly type: string;

  public constructor(type: string) {
    super(Resources.formatUnknownJournalRecord(type));

    this.type = type;
  }
}
