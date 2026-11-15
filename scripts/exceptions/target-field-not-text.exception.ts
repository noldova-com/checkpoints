/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { PackageException } from "./package.exception.ts";

export class TargetFieldNotTextException extends PackageException {
  public readonly file: string;
  public readonly target: string;
  public readonly field: string;

  public constructor(file: string, target: string, field: string) {
    super(Resources.formatTargetFieldNotText(file, target, field));

    this.file = file;
    this.target = target;
    this.field = field;
  }
}
