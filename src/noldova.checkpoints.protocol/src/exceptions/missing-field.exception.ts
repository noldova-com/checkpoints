/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { ProtocolException } from "./protocol.exception.ts";

export class MissingFieldException extends ProtocolException {
  public readonly field: string;
  public readonly model: string;

  public constructor(model: string, field: string) {
    super(Resources.formatMissingField(model, field));

    this.field = field;
    this.model = model;
  }
}
