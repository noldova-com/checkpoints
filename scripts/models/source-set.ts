/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { SourceFile } from "./source-file.ts";

export class SourceSet {
  public readonly name: string;
  public readonly pages: readonly string[];
  public readonly files: readonly SourceFile[];

  public constructor(name: string, pages: readonly string[], files: readonly SourceFile[]) {
    this.name = name;
    this.pages = pages;
    this.files = files;
  }
}
