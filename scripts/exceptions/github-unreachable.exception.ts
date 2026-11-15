/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { GitHubException } from "./github.exception.ts";

export class GitHubUnreachableException extends GitHubException {
  public readonly address: string;

  public constructor(address: string, cause: unknown) {
    super(Resources.formatGitHubUnreachable(address), { cause });

    this.address = address;
  }
}
