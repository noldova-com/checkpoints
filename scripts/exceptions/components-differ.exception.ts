/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { PackageException } from "./package.exception.ts";

export class ComponentsDifferException extends PackageException {
  public readonly differences: readonly string[];
  public readonly file: string;

  public constructor(file: string, differences: readonly string[]) {
    super(Resources.formatComponentsDiffer(file, differences));

    this.differences = differences;
    this.file = file;
  }
}
