/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { GitHubException } from "./github.exception.ts";

export class GitReleaseTagInvalidException extends GitHubException {
  public readonly context: string;
  public readonly tag: string;

  public constructor(context: string, tag: string) {
    super(Resources.formatGitReleaseTagInvalid(context, tag));

    this.context = context;
    this.tag = tag;
  }
}
