/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { UnknownDeleteFolderOutcomeException } from "../exceptions/unknown-delete-folder-outcome.exception.ts";

export class DeleteFolderOutcome {
  public static readonly Deleted: DeleteFolderOutcome = new DeleteFolderOutcome("Deleted");
  public static readonly HeldUp: DeleteFolderOutcome = new DeleteFolderOutcome("HeldUp");
  private static readonly ALL: readonly DeleteFolderOutcome[] = [DeleteFolderOutcome.Deleted, DeleteFolderOutcome.HeldUp];
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static fromJson(value: unknown): DeleteFolderOutcome {
    const outcome = DeleteFolderOutcome.ALL.find(t => t.value === value);
    if (outcome === undefined)
      throw new UnknownDeleteFolderOutcomeException(String(value));
    return outcome;
  }

  public toJson(): string {
    return this.value;
  }
}
