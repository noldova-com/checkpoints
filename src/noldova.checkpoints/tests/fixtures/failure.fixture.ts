/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class FailureFixture extends Error {
  public readonly code: unknown;
  public readonly errno: unknown;

  public constructor(message: string, code: unknown, errno: unknown = undefined) {
    super(message);
    this.code = code;
    this.errno = errno;
  }

  public static hasCode(error: unknown, code: string): boolean {
    return error instanceof Error && "code" in error && error.code === code;
  }
}
