/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { PackageException } from "./package.exception.ts";

export class RootVersionInvalidException extends PackageException {
  public readonly found: unknown;

  public constructor(found: unknown) {
    super(Resources.formatRootVersionInvalid(found));

    this.found = found;
  }
}
