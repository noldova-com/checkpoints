/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { PackageException } from "./package.exception.ts";

export class BuildEntryTypeException extends PackageException {
  public readonly entry: string;
  public readonly type: string;

  public constructor(entry: string, type: string) {
    super(Resources.formatBuildEntryType(entry, type));

    this.entry = entry;
    this.type = type;
  }
}
