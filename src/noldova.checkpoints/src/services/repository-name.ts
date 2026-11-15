/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";

export class RepositoryName {
  public static matches(name: string): boolean {
    return Resources.ntfsRepositoryPattern.test(name) || Resources.hfsRepositoryPattern.test(name.replace(Resources.hfsIgnoredPattern, ""));
  }
}
