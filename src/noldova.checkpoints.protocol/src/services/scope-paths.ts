/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { InvalidRelativePathException } from "../exceptions/invalid-relative-path.exception.ts";
import { Resources } from "../resources.ts";
import type { JsonValue } from "../types/json-value.ts";
import { RelativePath } from "./relative-path.ts";

export class ScopePaths {
  public static of(paths: readonly string[] | null): readonly string[] | null {
    if (paths === null)
      return null;
    for (const path of paths)
      if (path.includes(Resources.windowsPathSeparator) || !RelativePath.isValid(path))
        throw new InvalidRelativePathException(path);
    return [...paths];
  }

  public static toJson(paths: readonly string[] | null): JsonValue {
    return paths === null ? null : [...paths];
  }
}
