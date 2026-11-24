/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { SourceFile } from "./source-file.ts";

export class SourceArchive {
  public readonly name: string;
  public readonly url: string;
  public readonly size: number;
  public readonly sha256: string;
  public readonly files: readonly SourceFile[];

  public constructor(name: string, url: string, size: number, sha256: string, files: readonly SourceFile[]) {
    this.name = name;
    this.url = url;
    this.size = size;
    this.sha256 = sha256;
    this.files = files;
  }
}
