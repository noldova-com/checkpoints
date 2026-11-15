/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { PackageException } from "./package.exception.ts";

export class BuildLinkOutsideException extends PackageException {
  public readonly link: string;
  public readonly target: string;

  public constructor(link: string, target: string) {
    super(Resources.formatBuildLinkOutside(link, target));

    this.link = link;
    this.target = target;
  }
}
