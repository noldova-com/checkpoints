/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { StoreException } from "./store.exception.ts";

export class TreeLineMalformedException extends StoreException {
  public readonly line: string;

  public constructor(line: string) {
    super(Resources.formatTreeLineMalformed(line));

    this.line = line;
  }
}
