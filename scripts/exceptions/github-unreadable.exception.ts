/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { GitHubException } from "./github.exception.ts";

export class GitHubUnreadableException extends GitHubException {
  public readonly context: string;
  public readonly status: number;
  public readonly body: string;

  public constructor(context: string, status: number, body: string) {
    super(Resources.formatGitHubUnreadable(context, status, body));

    this.context = context;
    this.status = status;
    this.body = body;
  }
}
