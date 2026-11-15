/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { InvalidCheckpointIdException } from "../exceptions/invalid-checkpoint-id.exception.ts";
import { Resources } from "../resources.ts";

export class CheckpointId {
  public static check(id: string): void {
    if (!Resources.versionSevenIdPattern.test(id))
      throw new InvalidCheckpointIdException(id);
  }
}
