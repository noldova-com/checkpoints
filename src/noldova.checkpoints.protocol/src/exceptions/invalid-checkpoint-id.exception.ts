/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { ProtocolException } from "./protocol.exception.ts";

export class InvalidCheckpointIdException extends ProtocolException {
  public readonly id: string;

  public constructor(id: string) {
    super(Resources.formatInvalidCheckpointId(id));

    this.id = id;
  }
}
