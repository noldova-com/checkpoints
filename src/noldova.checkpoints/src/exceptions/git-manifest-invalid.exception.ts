/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ExceptionOptions } from "@noldova/context.exceptions";

import { Resources } from "../resources.ts";
import { CheckpointsException } from "./checkpoints.exception.ts";

export class GitManifestInvalidException extends CheckpointsException {
  public readonly manifestFile: string;

  public constructor(manifestFile: string, cause: Error) {
    super(Resources.formatGitManifestInvalid(manifestFile, cause.message), new ExceptionOptions(cause));

    this.manifestFile = manifestFile;
  }
}
