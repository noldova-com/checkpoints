/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";

export class TestsLine {
  public readonly isWellFormed: boolean;
  public readonly line: number;
  public readonly names: readonly string[];

  public constructor(line: number, isWellFormed: boolean, names: readonly string[]) {
    this.isWellFormed = isWellFormed;
    this.line = line;
    this.names = names;
  }

  public static parse(line: number, text: string): TestsLine {
    const names = [...text.matchAll(Resources.citedTestPattern)].map(t => (t.groups?.["name"] ?? "").replaceAll(Resources.escapedCharacterPattern, "$1"));
    return new TestsLine(line, Resources.testsLinePattern.test(text), names);
  }
}
