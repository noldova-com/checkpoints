/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { PackageException } from "./package.exception.ts";

export class BuildEntryMalformedException extends PackageException {
  public readonly offset: number;

  public constructor(offset: number) {
    super(Resources.formatBuildEntryMalformed(offset));

    this.offset = offset;
  }
}
