/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class ErrorCode {
  public static of(error: unknown): string | undefined {
    return error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : undefined;
  }
}
