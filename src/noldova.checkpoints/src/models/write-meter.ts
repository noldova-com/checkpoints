/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class WriteMeter {
  public readonly check: (written: number) => Promise<boolean>;
  public readonly interval: number;

  public constructor(interval: number, check: (written: number) => Promise<boolean>) {
    this.check = check;
    this.interval = interval;
  }
}
