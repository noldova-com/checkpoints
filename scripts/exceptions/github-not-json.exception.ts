/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { GitHubException } from "./github.exception.ts";

export class GitHubNotJsonException extends GitHubException {
  public readonly context: string;
  public readonly body: string;

  public constructor(context: string, body: string, cause: unknown) {
    super(Resources.formatGitHubNotJson(context, body), { cause });

    this.context = context;
    this.body = body;
  }
}
