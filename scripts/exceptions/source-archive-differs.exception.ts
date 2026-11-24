/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { PackageException } from "./package.exception.ts";

export class SourceArchiveDiffersException extends PackageException {
  public readonly archive: string;
  public readonly size: number;
  public readonly sha256: string;
  public readonly pinnedSize: number;
  public readonly pinnedSha256: string;

  public constructor(archive: string, size: number, sha256: string, pinnedSize: number, pinnedSha256: string) {
    super(Resources.formatSourceArchiveDiffers(archive, size, sha256, pinnedSize, pinnedSha256));

    this.archive = archive;
    this.size = size;
    this.sha256 = sha256;
    this.pinnedSize = pinnedSize;
    this.pinnedSha256 = pinnedSha256;
  }
}
