/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { GitException } from "./git.exception.ts";

export class GitExitedException extends GitException {
  public override readonly command: string;
  public override readonly errors: string;
  public readonly exitCode: number;

  public constructor(command: string, exitCode: number, errors: string) {
    super(Resources.formatGitExited(command, exitCode, errors));

    this.command = command;
    this.errors = errors;
    this.exitCode = exitCode;
  }
}
