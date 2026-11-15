/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class LeftObject {
  public readonly files: readonly string[];
  public readonly id: string;

  public constructor(id: string, files: readonly string[]) {
    this.files = files;
    this.id = id;
  }
}
