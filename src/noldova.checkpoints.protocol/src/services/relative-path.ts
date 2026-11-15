/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";

export class RelativePath {
  public static isValid(path: string): boolean {
    return !path.split(Resources.relativePathSeparator).some(t => t === "" || t === Resources.currentFolderName || t === Resources.parentFolderName);
  }
}
