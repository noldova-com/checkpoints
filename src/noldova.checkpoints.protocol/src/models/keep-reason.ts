/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "@noldova/context.core";

import { UnknownKeepReasonException } from "../exceptions/unknown-keep-reason.exception.ts";

export class KeepReason {
  public static readonly Repository: KeepReason = new KeepReason("Repository");
  public static readonly RepositoryFolder: KeepReason = new KeepReason("RepositoryFolder");
  public static readonly Ignored: KeepReason = new KeepReason("Ignored");
  public static readonly Unread: KeepReason = new KeepReason("Unread");
  public static readonly LinkUnsupported: KeepReason = new KeepReason("LinkUnsupported");
  public static readonly TooLarge: KeepReason = new KeepReason("TooLarge");
  private static readonly ALL: readonly KeepReason[] = [KeepReason.Repository, KeepReason.RepositoryFolder, KeepReason.Ignored, KeepReason.Unread, KeepReason.LinkUnsupported, KeepReason.TooLarge];
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static fromJson(value: unknown): KeepReason {
    const reason = KeepReason.ALL.find(t => t.value === value);
    if (Object.isUndefined(reason))
      throw new UnknownKeepReasonException(String(value));
    return reason;
  }

  public toJson(): string {
    return this.value;
  }
}
