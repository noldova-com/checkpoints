/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { ProcessException } from "./process.exception.ts";

export class ProcessNotStoppedException extends ProcessException {
  public readonly command: string;
  public readonly wait: number;

  public constructor(command: string, wait: number, cause: unknown) {
    super(Resources.formatProcessNotStopped(command, wait), { cause });

    this.command = command;
    this.wait = wait;
  }
}
