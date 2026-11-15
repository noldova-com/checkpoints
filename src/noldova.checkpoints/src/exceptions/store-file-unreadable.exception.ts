/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ExceptionOptions } from "@noldova/context.exceptions";

import { Resources } from "../resources.ts";
import { StoreException } from "./store.exception.ts";

export class StoreFileUnreadableException extends StoreException {
  public readonly file: string;

  public constructor(file: string, cause: Error) {
    super(Resources.formatUnreadableStore(file, cause.message), new ExceptionOptions(cause));

    this.file = file;
  }
}
