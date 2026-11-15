/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { TestRunException } from "./test-run.exception.ts";

export class ArchitectureDocumentMissingException extends TestRunException {
  public readonly file: string;

  public constructor(file: string) {
    super(Resources.formatArchitectureDocumentMissing(file));

    this.file = file;
  }
}
