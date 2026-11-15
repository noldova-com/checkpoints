/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { PackageException } from "./package.exception.ts";

export class ArchiveSizeMismatchException extends PackageException {
  public readonly url: string;
  public readonly size: number;
  public readonly pinned: number;

  public constructor(url: string, size: number, pinned: number) {
    super(Resources.formatArchiveSizeMismatch(url, size, pinned));

    this.url = url;
    this.size = size;
    this.pinned = pinned;
  }
}
