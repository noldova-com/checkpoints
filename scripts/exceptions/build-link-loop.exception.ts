/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { PackageException } from "./package.exception.ts";

export class BuildLinkLoopException extends PackageException {
  public readonly link: string;

  public constructor(link: string) {
    super(Resources.formatBuildLinkLoop(link));

    this.link = link;
  }
}
