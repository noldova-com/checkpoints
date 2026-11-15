/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { InvalidIdentityException } from "../exceptions/invalid-identity.exception.ts";
import { Resources } from "../resources.ts";

export class FolderIdentity {
  public static check(identity: string): void {
    if (!Resources.identityPattern.test(identity))
      throw new InvalidIdentityException(identity);
  }
}
