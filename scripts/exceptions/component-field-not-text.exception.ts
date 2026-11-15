/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { PackageException } from "./package.exception.ts";

export class ComponentFieldNotTextException extends PackageException {
  public readonly file: string;
  public readonly index: number;
  public readonly field: string;

  public constructor(file: string, index: number, field: string) {
    super(Resources.formatComponentFieldNotText(file, index, field));

    this.file = file;
    this.index = index;
    this.field = field;
  }
}
