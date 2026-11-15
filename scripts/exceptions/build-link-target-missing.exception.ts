/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { PackageException } from "./package.exception.ts";

export class BuildLinkTargetMissingException extends PackageException {
  public readonly link: string;
  public readonly target: string;

  public constructor(link: string, target: string, cause: unknown) {
    super(Resources.formatBuildLinkTargetMissing(link, target), { cause });

    this.link = link;
    this.target = target;
  }
}
