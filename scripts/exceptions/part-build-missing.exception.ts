/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { PackageException } from "./package.exception.ts";

export class PartBuildMissingException extends PackageException {
  public readonly packageName: string;

  public constructor(packageName: string) {
    super(Resources.formatPartBuildMissing(packageName));

    this.packageName = packageName;
  }
}
