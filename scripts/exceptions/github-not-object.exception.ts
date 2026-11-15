/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { GitHubException } from "./github.exception.ts";

export class GitHubNotObjectException extends GitHubException {
  public readonly context: string;

  public constructor(context: string) {
    super(Resources.formatGitHubNotObject(context));

    this.context = context;
  }
}
