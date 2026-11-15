/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";

export class RelativePath {
  public static join(folderPath: string, name: string): string {
    return folderPath === "" ? name : `${folderPath}${Resources.relativePathSeparator}${name}`;
  }

  public static parentOf(relativePath: string): string {
    const end = relativePath.lastIndexOf(Resources.relativePathSeparator);
    return end === -1 ? "" : relativePath.slice(0, end);
  }
}
