/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { StoreException } from "./store.exception.ts";

export class StoreFieldNotABooleanException extends StoreException {
  public readonly field: string;

  public constructor(field: string) {
    super(Resources.formatNotABoolean(field));

    this.field = field;
  }
}
