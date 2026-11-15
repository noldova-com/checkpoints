/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { WorkspacePart } from "./workspace-part.ts";

export class ReleaseArchive {
  public readonly part: WorkspacePart;
  public readonly filePath: string;

  public constructor(part: WorkspacePart, filePath: string) {
    this.part = part;
    this.filePath = filePath;
  }
}
