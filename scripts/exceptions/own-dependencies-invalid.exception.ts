/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { PackageException } from "./package.exception.ts";

export class OwnDependenciesInvalidException extends PackageException {
  public readonly file: string;
  public readonly ownField: string;
  public readonly field: string;

  public constructor(file: string, ownField: string, field: string) {
    super(Resources.formatOwnDependenciesInvalid(file, ownField, field));

    this.file = file;
    this.ownField = ownField;
    this.field = field;
  }
}
