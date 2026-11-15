/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { PackageException } from "./package.exception.ts";

export class ArchiveLongerThanPinnedException extends PackageException {
  public readonly pinned: number;
  public readonly url: string;

  public constructor(url: string, pinned: number) {
    super(Resources.formatArchiveLongerThanPinned(url, pinned));

    this.pinned = pinned;
    this.url = url;
  }
}
