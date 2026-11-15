/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { IgnorePattern } from "./ignore-pattern.ts";

export class IgnoreFile {
  private readonly base: string;
  private readonly patterns: readonly IgnorePattern[];
  public readonly content: Buffer;
  public readonly folderPath: string;

  public constructor(folderPath: string, content: Buffer, ignoresCase: boolean) {
    const marked = content.subarray(0, Resources.byteOrderMark.length).equals(Resources.byteOrderMark);
    const text = content.subarray(marked ? Resources.byteOrderMark.length : 0);
    this.base = IgnoreFile.bytesOf(folderPath);
    this.content = content;
    this.folderPath = folderPath;
    this.patterns = text.toString(Resources.latin1Encoding).split(Resources.lineFeed).map(t => IgnorePattern.parse(t, ignoresCase)).filter(t => t !== null);
  }

  public static bytesOf(text: string): string {
    return Buffer.from(text, Resources.utf8Encoding).toString(Resources.latin1Encoding);
  }

  public decide(path: string, name: string, isFolder: boolean): boolean | null {
    const relativePath = this.base === "" ? path : path.slice(this.base.length + 1);
    const pattern = this.patterns.findLast(t => t.matches(relativePath, name, isFolder));
    return pattern === undefined ? null : !pattern.isNegated;
  }
}
