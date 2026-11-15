/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { RelativePath } from "../services/relative-path.ts";
import { ProtocolException } from "./protocol.exception.ts";

export class InvalidRelativePathException extends ProtocolException {
  public readonly path: string;

  public constructor(path: string) {
    super(path.includes(Resources.windowsPathSeparator) && RelativePath.isValid(path) ? Resources.formatBackslashInPath(path) : Resources.formatInvalidRelativePath(path));

    this.path = path;
  }
}
