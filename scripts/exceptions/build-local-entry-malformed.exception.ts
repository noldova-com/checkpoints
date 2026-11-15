/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { PackageException } from "./package.exception.ts";

export class BuildLocalEntryMalformedException extends PackageException {
  public readonly entry: string;

  public constructor(entry: string) {
    super(Resources.formatBuildLocalEntryMalformed(entry));

    this.entry = entry;
  }
}
