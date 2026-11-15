/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { PackageException } from "./package.exception.ts";

export class PackageVersionsMissingException extends PackageException {
  public readonly target: string;
  public readonly url: string;

  public constructor(target: string, url: string) {
    super(Resources.formatPackageVersionsMissing(target, url));

    this.target = target;
    this.url = url;
  }
}
