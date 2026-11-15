/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class TreeEntry {
  public readonly mode: string;
  public readonly objectId: string;

  public constructor(mode: string, objectId: string) {
    this.mode = mode;
    this.objectId = objectId;
  }
}
