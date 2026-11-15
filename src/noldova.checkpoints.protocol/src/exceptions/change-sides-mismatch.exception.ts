/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { ChangeStatus } from "../models/change-status.ts";
import { Resources } from "../resources.ts";
import { ProtocolException } from "./protocol.exception.ts";

export class ChangeSidesMismatchException extends ProtocolException {
  public readonly status: ChangeStatus;

  public constructor(status: ChangeStatus) {
    super(Resources.formatChangeSidesMismatch(status.value));

    this.status = status;
  }
}
