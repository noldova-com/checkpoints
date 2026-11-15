/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { InvalidSizeException } from "../exceptions/invalid-size.exception.ts";

export class ByteSize {
  public static check(size: number): void {
    if (!Number.isSafeInteger(size) || size < 0)
      throw new InvalidSizeException(size);
  }
}
