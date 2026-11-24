/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "@noldova/context.core";

import { UnknownReadOutcomeException } from "../exceptions/unknown-read-outcome.exception.ts";

export class ReadOutcome {
  public static readonly Read: ReadOutcome = new ReadOutcome("Read", true);
  public static readonly FolderMissing: ReadOutcome = new ReadOutcome("FolderMissing", false);
  public static readonly CheckpointMissing: ReadOutcome = new ReadOutcome("CheckpointMissing", false);
  public static readonly PathMissing: ReadOutcome = new ReadOutcome("PathMissing", false);
  public static readonly Unknown: ReadOutcome = new ReadOutcome("Unknown", false);
  public static readonly Binary: ReadOutcome = new ReadOutcome("Binary", false);
  private static readonly ALL: readonly ReadOutcome[] = [
    ReadOutcome.Read, ReadOutcome.FolderMissing, ReadOutcome.CheckpointMissing, ReadOutcome.PathMissing, ReadOutcome.Unknown, ReadOutcome.Binary
  ];
  public readonly isRead: boolean;
  public readonly value: string;

  private constructor(value: string, isRead: boolean) {
    this.isRead = isRead;
    this.value = value;
  }

  public static fromJson(value: unknown): ReadOutcome {
    const outcome = ReadOutcome.ALL.find(t => t.value === value);
    if (Object.isUndefined(outcome))
      throw new UnknownReadOutcomeException(String(value));
    return outcome;
  }

  public toJson(): string {
    return this.value;
  }
}
