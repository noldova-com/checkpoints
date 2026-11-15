/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { GitHubException } from "./github.exception.ts";

export class GitHubBodyTooLongException extends GitHubException {
  public readonly context: string;
  public readonly limit: number;

  public constructor(context: string, limit: number) {
    super(Resources.formatGitHubBodyTooLong(context, limit));

    this.context = context;
    this.limit = limit;
  }
}
