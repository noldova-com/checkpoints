/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { WildcardPattern } from "./wildcard-pattern.ts";

export class IgnorePattern {
  private readonly isFolderOnly: boolean;
  private readonly isNameOnly: boolean;
  private readonly wildcard: WildcardPattern;
  public readonly isNegated: boolean;

  private constructor(isNegated: boolean, isFolderOnly: boolean, isNameOnly: boolean, wildcard: WildcardPattern) {
    this.isFolderOnly = isFolderOnly;
    this.isNameOnly = isNameOnly;
    this.isNegated = isNegated;
    this.wildcard = wildcard;
  }

  public static parse(line: string, ignoresCase: boolean): IgnorePattern | null {
    if (line === "" || line.startsWith(Resources.ignoreComment))
      return null;

    let text = line.endsWith(Resources.carriageReturn) ? line.slice(0, -1) : line;
    const end = text.indexOf(Resources.nulCharacter);
    text = IgnorePattern.trimTrailingSpaces(end < 0 ? text : text.slice(0, end));
    const isNegated = text.startsWith(Resources.ignoreNegation);
    if (isNegated)
      text = text.slice(1);
    const isFolderOnly = text.endsWith(Resources.relativePathSeparator);
    if (isFolderOnly)
      text = text.slice(0, -1);
    const isNameOnly = !text.includes(Resources.relativePathSeparator);
    if (text.startsWith(Resources.relativePathSeparator))
      text = text.slice(1);
    return text === "" ? null : new IgnorePattern(isNegated, isFolderOnly, isNameOnly, new WildcardPattern(text, ignoresCase));
  }

  public matches(relativePath: string, name: string, isFolder: boolean): boolean {
    return (isFolder || !this.isFolderOnly) && this.wildcard.matches(this.isNameOnly ? name : relativePath);
  }

  private static trimTrailingSpaces(text: string): string {
    let firstTrailing = -1;
    for (let index = 0; index < text.length; index++) {
      const character = text[index];
      if (character === Resources.space) {
        if (firstTrailing < 0)
          firstTrailing = index;
        continue;
      }
      if (character === Resources.ignoreEscape && ++index === text.length)
        return text;
      firstTrailing = -1;
    }
    return firstTrailing < 0 ? text : text.slice(0, firstTrailing);
  }
}
