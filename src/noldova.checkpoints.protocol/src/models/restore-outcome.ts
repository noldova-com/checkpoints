/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { UnknownRestoreOutcomeException } from "../exceptions/unknown-restore-outcome.exception.ts";

export class RestoreOutcome {
  public static readonly Restored: RestoreOutcome = new RestoreOutcome("Restored", true);
  public static readonly MovedOn: RestoreOutcome = new RestoreOutcome("MovedOn", false);
  public static readonly CheckpointMissing: RestoreOutcome = new RestoreOutcome("CheckpointMissing", false);
  public static readonly FolderMissing: RestoreOutcome = new RestoreOutcome("FolderMissing", false);
  public static readonly LowDiskSpace: RestoreOutcome = new RestoreOutcome("LowDiskSpace", false);
  public static readonly HeldUp: RestoreOutcome = new RestoreOutcome("HeldUp", false);
  public static readonly RolledBack: RestoreOutcome = new RestoreOutcome("RolledBack", false);
  public static readonly TooLarge: RestoreOutcome = new RestoreOutcome("TooLarge", false);
  private static readonly ALL: readonly RestoreOutcome[] = [
    RestoreOutcome.Restored, RestoreOutcome.MovedOn, RestoreOutcome.CheckpointMissing, RestoreOutcome.FolderMissing, RestoreOutcome.LowDiskSpace, RestoreOutcome.HeldUp,
    RestoreOutcome.RolledBack, RestoreOutcome.TooLarge
  ];
  public readonly isRestored: boolean;
  public readonly value: string;

  private constructor(value: string, isRestored: boolean) {
    this.isRestored = isRestored;
    this.value = value;
  }

  public static fromJson(value: unknown): RestoreOutcome {
    const outcome = RestoreOutcome.ALL.find(t => t.value === value);
    if (outcome === undefined)
      throw new UnknownRestoreOutcomeException(String(value));
    return outcome;
  }

  public toJson(): string {
    return this.value;
  }
}
