/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { PackageException } from "./package.exception.ts";

export class ArchiveHashMismatchException extends PackageException {
  public readonly url: string;
  public readonly hash: string;
  public readonly pinned: string;

  public constructor(url: string, hash: string, pinned: string) {
    super(Resources.formatArchiveHashMismatch(url, hash, pinned));

    this.url = url;
    this.hash = hash;
    this.pinned = pinned;
  }
}
