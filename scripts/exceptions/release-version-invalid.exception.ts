/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { ReleaseException } from "./release.exception.ts";

export class ReleaseVersionInvalidException extends ReleaseException {
  public readonly version: string | undefined;

  public constructor(version: string | undefined) {
    super(Resources.formatReleaseVersionInvalid(version));

    this.version = version;
  }
}
