/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { UnknownUnreadReasonException } from "../exceptions/unknown-unread-reason.exception.ts";

export class UnreadReason {
  public static readonly Changing: UnreadReason = new UnreadReason("Changing");
  public static readonly Denied: UnreadReason = new UnreadReason("Denied");
  public static readonly InvalidName: UnreadReason = new UnreadReason("InvalidName");
  public static readonly TooLarge: UnreadReason = new UnreadReason("TooLarge");
  public static readonly Unreadable: UnreadReason = new UnreadReason("Unreadable");
  private static readonly ALL: readonly UnreadReason[] = [UnreadReason.Changing, UnreadReason.Denied, UnreadReason.InvalidName, UnreadReason.TooLarge, UnreadReason.Unreadable];
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static fromJson(value: unknown): UnreadReason {
    const reason = UnreadReason.ALL.find(t => t.value === value);
    if (reason === undefined)
      throw new UnknownUnreadReasonException(String(value));
    return reason;
  }

  public toJson(): string {
    return this.value;
  }
}
