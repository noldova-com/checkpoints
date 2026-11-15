/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { ProtocolException } from "./protocol.exception.ts";

export class InvalidIdentityException extends ProtocolException {
  public readonly identity: string;

  public constructor(identity: string) {
    super(Resources.invalidIdentity);

    this.identity = identity;
  }
}
