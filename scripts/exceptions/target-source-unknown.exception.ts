/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { PackageException } from "./package.exception.ts";

export class TargetSourceUnknownException extends PackageException {
  public readonly target: string;
  public readonly url: string;
  public readonly repositories: readonly string[];

  public constructor(target: string, url: string, repositories: readonly string[]) {
    super(Resources.formatTargetSourceUnknown(target, url, repositories));

    this.target = target;
    this.url = url;
    this.repositories = repositories;
  }
}
