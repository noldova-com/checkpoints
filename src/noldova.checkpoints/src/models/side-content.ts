/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { SideFile } from "./side-file.ts";
import type { UnhashedFile } from "./unhashed-file.ts";

export class SideContent {
  public readonly content: Buffer;
  public readonly file: SideFile | UnhashedFile;

  public constructor(file: SideFile | UnhashedFile, content: Buffer) {
    this.content = content;
    this.file = file;
  }
}
