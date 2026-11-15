/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { TestRunException } from "./test-run.exception.ts";

export class TestResultUnreadableException extends TestRunException {
  public readonly line: string;
  public readonly resultsFile: string;

  public constructor(resultsFile: string, line: string, cause?: unknown) {
    super(Resources.formatTestResultUnreadable(resultsFile, line), cause === undefined ? undefined : { cause });

    this.line = line;
    this.resultsFile = resultsFile;
  }
}
