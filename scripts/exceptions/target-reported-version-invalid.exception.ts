/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { PackageException } from "./package.exception.ts";

export class TargetReportedVersionInvalidException extends PackageException {
  public readonly file: string;
  public readonly gitVersion: string;
  public readonly target: string;

  public constructor(file: string, target: string, gitVersion: string) {
    super(Resources.formatTargetReportedVersionInvalid(file, target, gitVersion));

    this.file = file;
    this.gitVersion = gitVersion;
    this.target = target;
  }
}
