/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { GitException } from "./git.exception.ts";

export class GitStoppedException extends GitException {
  public override readonly command: string;
  public override readonly errors: string;

  public constructor(command: string, errors: string) {
    super(Resources.formatGitStopped(command, errors));

    this.command = command;
    this.errors = errors;
  }
}
