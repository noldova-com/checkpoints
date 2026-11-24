/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class SourceFile {
  public readonly url: string;
  public readonly size: number;
  public readonly sha256: string;

  public constructor(url: string, size: number, sha256: string) {
    this.url = url;
    this.size = size;
    this.sha256 = sha256;
  }
}
