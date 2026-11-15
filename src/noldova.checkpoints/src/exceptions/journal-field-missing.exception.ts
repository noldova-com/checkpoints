/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { StoreException } from "./store.exception.ts";

export class JournalFieldMissingException extends StoreException {
  public readonly field: string;
  public readonly model: string;

  public constructor(model: string, field: string) {
    super(Resources.formatUnreadableStore(Resources.restoreFile, Resources.formatJournalFieldMissing(model, field)));

    this.field = field;
    this.model = model;
  }
}
