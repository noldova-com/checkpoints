/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "@noldova/context.core";

export class ErrorCode {
  public static of(error: unknown): string | undefined {
    return error instanceof Error && "code" in error && Object.isString(error.code) ? error.code : undefined;
  }
}
