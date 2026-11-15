/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class ImportResult<T> {
  public readonly commit: string | null;
  public readonly written: T;

  public constructor(written: T, commit: string | null) {
    this.commit = commit;
    this.written = written;
  }
}
