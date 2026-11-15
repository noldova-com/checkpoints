/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { ProtocolException } from "./protocol.exception.ts";

export class InvalidFolderPathException extends ProtocolException {
  public readonly path: string;

  public constructor(path: string) {
    super(Resources.formatInvalidFolderPath(path));

    this.path = path;
  }
}
