/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { Checkpoint, RestoreOutcome } from "@noldova/checkpoints.protocol";

export class FinishedRestore {
  public readonly isClosed: boolean;
  public readonly outcome: RestoreOutcome;
  public readonly recovered: Checkpoint | null;

  public constructor(outcome: RestoreOutcome, recovered: Checkpoint | null, isClosed: boolean) {
    this.isClosed = isClosed;
    this.outcome = outcome;
    this.recovered = recovered;
  }
}
