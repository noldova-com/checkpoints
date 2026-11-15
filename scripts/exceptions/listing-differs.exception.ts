/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { PackageException } from "./package.exception.ts";

export class ListingDiffersException extends PackageException {
  public readonly differences: readonly string[];

  public constructor(differences: readonly string[]) {
    super(Resources.formatListingDiffers(differences));

    this.differences = differences;
  }
}
