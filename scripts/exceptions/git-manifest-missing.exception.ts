/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { PackageException } from "./package.exception.ts";

export class GitManifestMissingException extends PackageException {
  public readonly file: string;
  public readonly expected: string;

  public constructor(file: string, expected: string) {
    super(Resources.formatGitManifestMissing(file, expected));

    this.file = file;
    this.expected = expected;
  }
}
