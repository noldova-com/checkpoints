/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { PackageException } from "./package.exception.ts";

export class ComponentTextsMissingException extends PackageException {
  public readonly file: string;
  public readonly index: number;

  public constructor(file: string, index: number) {
    super(Resources.formatComponentTextsMissing(file, index));

    this.file = file;
    this.index = index;
  }
}
