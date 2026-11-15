/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { StoreException } from "./store.exception.ts";

export class UnknownLinkKindException extends StoreException {
  public readonly value: string;

  public constructor(value: string) {
    super(Resources.formatUnknownLinkKind(value));

    this.value = value;
  }
}
