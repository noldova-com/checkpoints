/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { ReleaseException } from "./release.exception.ts";

export class ReleaseManifestInvalidException extends ReleaseException {
  public readonly context: string;

  public constructor(context: string, cause: unknown) {
    super(Resources.formatReleaseManifestInvalid(context), { cause });

    this.context = context;
  }
}
