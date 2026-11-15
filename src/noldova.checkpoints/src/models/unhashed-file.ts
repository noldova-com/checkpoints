/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class UnhashedFile {
  public readonly fileId: string;
  public readonly location: string;

  public constructor(location: string, fileId: string) {
    this.fileId = fileId;
    this.location = location;
  }
}
