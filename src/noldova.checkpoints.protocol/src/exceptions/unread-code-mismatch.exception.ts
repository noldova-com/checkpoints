/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { UnreadReason } from "../models/unread-reason.ts";
import { Resources } from "../resources.ts";
import { ProtocolException } from "./protocol.exception.ts";

export class UnreadCodeMismatchException extends ProtocolException {
  public readonly reason: UnreadReason;

  public constructor(reason: UnreadReason) {
    super(Resources.formatUnreadCodeMismatch(reason.value));

    this.reason = reason;
  }
}
