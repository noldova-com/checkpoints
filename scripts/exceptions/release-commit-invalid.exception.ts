/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { ReleaseException } from "./release.exception.ts";

export class ReleaseCommitInvalidException extends ReleaseException {
  public readonly commit: string | undefined;

  public constructor(commit: string | undefined) {
    super(Resources.formatReleaseCommitInvalid(commit));

    this.commit = commit;
  }
}
