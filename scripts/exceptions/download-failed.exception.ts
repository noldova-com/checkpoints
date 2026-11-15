/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { PackageException } from "./package.exception.ts";

export class DownloadFailedException extends PackageException {
  public readonly url: string;
  public readonly status: number;

  public constructor(url: string, status: number) {
    super(Resources.formatDownloadFailed(url, status));

    this.url = url;
    this.status = status;
  }
}
