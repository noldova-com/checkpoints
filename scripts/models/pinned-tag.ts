/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class PinnedTag {
  public readonly tag: string;
  public readonly target: string;

  public constructor(target: string, tag: string) {
    this.tag = tag;
    this.target = target;
  }
}
