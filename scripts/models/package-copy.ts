/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class PackageCopy {
  public readonly packageName: string;
  public readonly path: string;
  public readonly source: string;

  public constructor(source: string, packageName: string, path: string) {
    this.packageName = packageName;
    this.path = path;
    this.source = source;
  }
}
