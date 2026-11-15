/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class GitLimits {
  public readonly batchIdleMilliseconds: number;
  public readonly commandMilliseconds: number;
  public readonly idleStopMilliseconds: number;
  public readonly stopMilliseconds: number;

  public constructor(commandMilliseconds: number, batchIdleMilliseconds: number, idleStopMilliseconds: number, stopMilliseconds: number) {
    this.batchIdleMilliseconds = batchIdleMilliseconds;
    this.commandMilliseconds = commandMilliseconds;
    this.idleStopMilliseconds = idleStopMilliseconds;
    this.stopMilliseconds = stopMilliseconds;
  }
}
