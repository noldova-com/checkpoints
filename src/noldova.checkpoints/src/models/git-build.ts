/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class GitBuild {
  public readonly execPath: string;
  public readonly path: readonly string[];
  public readonly program: string;

  public constructor(program: string, execPath: string, path: readonly string[]) {
    this.execPath = execPath;
    this.path = [...path];
    this.program = program;
  }
}
