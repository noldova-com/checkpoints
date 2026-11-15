/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { TestRunException } from "./test-run.exception.ts";

export class ConsumerInstallFailedException extends TestRunException {
  public readonly exitCode: number | null;

  public constructor(exitCode: number | null, output: string) {
    super(Resources.formatConsumerInstallFailed(exitCode, output));

    this.exitCode = exitCode;
  }
}
