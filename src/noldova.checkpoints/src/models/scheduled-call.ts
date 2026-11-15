/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class ScheduledCall {
  private readonly cancelCall: () => void;

  public constructor(cancel: () => void) {
    this.cancelCall = cancel;
  }

  public cancel(): void {
    this.cancelCall();
  }
}
