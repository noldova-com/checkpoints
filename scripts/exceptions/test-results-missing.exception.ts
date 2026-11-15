/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { TestRunException } from "./test-run.exception.ts";

export class TestResultsMissingException extends TestRunException {
  public readonly resultsFile: string;

  public constructor(resultsFile: string) {
    super(Resources.formatTestResultsMissing(resultsFile));

    this.resultsFile = resultsFile;
  }
}
