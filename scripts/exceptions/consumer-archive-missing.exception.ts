/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { TestRunException } from "./test-run.exception.ts";

export class ConsumerArchiveMissingException extends TestRunException {
  public readonly packageName: string;

  public constructor(packageName: string) {
    super(Resources.formatConsumerArchiveMissing(packageName));

    this.packageName = packageName;
  }
}
