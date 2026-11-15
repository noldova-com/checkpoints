/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { GitHubException } from "./github.exception.ts";

export class GitHubTimeoutException extends GitHubException {
  public readonly address: string;
  public readonly timeout: number;

  public constructor(address: string, timeout: number, cause: unknown) {
    super(Resources.formatGitHubTimeout(address, timeout), { cause });

    this.address = address;
    this.timeout = timeout;
  }
}
