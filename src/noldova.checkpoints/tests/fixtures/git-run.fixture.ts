/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class GitRun {
  public readonly code: number | null;
  public readonly errors: Buffer;
  public readonly output: Buffer;

  public constructor(code: number | null, output: Buffer, errors: Buffer) {
    this.code = code;
    this.errors = errors;
    this.output = output;
  }
}
