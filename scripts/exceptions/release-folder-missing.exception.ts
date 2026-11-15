/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { ReleaseException } from "./release.exception.ts";

export class ReleaseFolderMissingException extends ReleaseException {
  public readonly folder: string;

  public constructor(folder: string) {
    super(Resources.formatReleaseFolderMissing(folder));

    this.folder = folder;
  }
}
