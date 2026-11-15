/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class UnpackedBuild {
  public readonly entries: readonly string[];
  public readonly fileCount: number;
  public readonly listing: readonly string[];

  public constructor(fileCount: number, entries: readonly string[], listing: readonly string[]) {
    this.entries = entries;
    this.fileCount = fileCount;
    this.listing = listing;
  }
}
