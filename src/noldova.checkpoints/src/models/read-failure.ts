/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "@noldova/context.core";
import { UnreadPath, UnreadReason } from "@noldova/checkpoints.protocol";

import { Resources } from "../resources.ts";
import { Failures } from "../services/failures.ts";

export class ReadFailure {
  public static readonly Gone: ReadFailure = new ReadFailure(null, null);
  public static readonly Denied: ReadFailure = new ReadFailure(UnreadReason.Denied, null);
  public static readonly Changing: ReadFailure = new ReadFailure(UnreadReason.Changing, null);
  public readonly reason: UnreadReason | null;
  public readonly code: string | null;

  private constructor(reason: UnreadReason | null, code: string | null) {
    this.reason = reason;
    this.code = code;
  }

  public static of(error: unknown): ReadFailure {
    if (Failures.isAbsent(error))
      return ReadFailure.Gone;
    if (Failures.hasCode(error, Resources.deniedCodes))
      return ReadFailure.Denied;
    if (Failures.hasCode(error, Resources.changingCodes))
      return ReadFailure.Changing;
    const code = Failures.systemCodeOf(error);
    if (Object.isNull(code) || Resources.failingCodes.includes(code))
      throw error;
    return new ReadFailure(UnreadReason.Unreadable, code);
  }

  public unreadOf(path: string): UnreadPath | null {
    return Object.isNull(this.reason) ? null : new UnreadPath(path, this.reason, this.code);
  }
}
