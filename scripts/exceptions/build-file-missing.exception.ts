/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { PackageException } from "./package.exception.ts";

export class BuildFileMissingException extends PackageException {
  public readonly url: string;
  public readonly file: string;
  public readonly target: string;

  public constructor(url: string, file: string, target: string) {
    super(Resources.formatBuildFileMissing(url, file, target));

    this.url = url;
    this.file = file;
    this.target = target;
  }
}
