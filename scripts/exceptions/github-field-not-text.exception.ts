/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { GitHubException } from "./github.exception.ts";

export class GitHubFieldNotTextException extends GitHubException {
  public readonly context: string;
  public readonly field: string;

  public constructor(context: string, field: string) {
    super(Resources.formatGitHubFieldNotText(context, field));

    this.context = context;
    this.field = field;
  }
}
