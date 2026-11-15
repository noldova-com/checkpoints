/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { PackageException } from "./package.exception.ts";

export class DroppedUnlistedException extends PackageException {
  public readonly target: string;
  public readonly entry: string;

  public constructor(target: string, entry: string) {
    super(Resources.formatDroppedUnlisted(target, entry));

    this.target = target;
    this.entry = entry;
  }
}
