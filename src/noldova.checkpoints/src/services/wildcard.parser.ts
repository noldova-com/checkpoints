/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "@noldova/context.core";

import { ByteSet } from "../models/byte-set.ts";
import { Resources } from "../resources.ts";

export class WildcardParser {
  private static readonly CLASSES: ReadonlyMap<string, (code: number, ignoresCase: boolean) => boolean> = new Map([
    [Resources.posixClassAlnum, (t: number) => WildcardParser.isLetter(t) || WildcardParser.isDigit(t)],
    [Resources.posixClassAlpha, (t: number) => WildcardParser.isLetter(t)],
    [Resources.posixClassBlank, (t: number) => t === Resources.asciiSpace || t === Resources.asciiTab],
    [Resources.posixClassCntrl, (t: number) => t < Resources.asciiSpace || t === Resources.asciiDelete],
    [Resources.posixClassDigit, (t: number) => WildcardParser.isDigit(t)],
    [Resources.posixClassGraph, (t: number) => t >= Resources.asciiGraphFirst && t <= Resources.asciiPrintLast],
    [Resources.posixClassLower, (t: number) => WildcardParser.isLower(t)],
    [Resources.posixClassPrint, (t: number) => t >= Resources.asciiSpace && t <= Resources.asciiPrintLast],
    [Resources.posixClassPunct, (t: number) => t >= Resources.asciiGraphFirst && t <= Resources.asciiPrintLast &&
      !WildcardParser.isLetter(t) && !WildcardParser.isDigit(t)],
    [Resources.posixClassSpace, (t: number) => t === Resources.asciiSpace || t === Resources.asciiTab || t === Resources.lineFeedByte ||
      t === Resources.asciiCarriageReturn],
    [Resources.posixClassUpper, (t: number, ignoresCase: boolean) => WildcardParser.isUpper(t) || ignoresCase && WildcardParser.isLower(t)],
    [Resources.posixClassXdigit, (t: number) => WildcardParser.isDigit(t) || t >= Resources.asciiUpperFirst && t <= Resources.asciiUpperHexLast ||
      t >= Resources.asciiLowerFirst && t <= Resources.asciiLowerHexLast]
  ]);
  private readonly ignoresCase: boolean;
  private readonly pattern: string;
  private position: number = 0;

  public constructor(pattern: string, ignoresCase: boolean) {
    this.ignoresCase = ignoresCase;
    this.pattern = pattern;
  }

  public parse(): string | null {
    const parts: string[] = [Resources.patternStart];
    while (this.position < this.pattern.length) {
      const part = this.readPlace();
      if (Object.isNull(part))
        return null;
      parts.push(part);
    }
    parts.push(Resources.patternEnd);
    return parts.join("");
  }

  private static isDigit(code: number): boolean {
    return code >= Resources.asciiDigitFirst && code <= Resources.asciiDigitLast;
  }

  private static isLetter(code: number): boolean {
    return WildcardParser.isUpper(code) || WildcardParser.isLower(code);
  }

  private static isLower(code: number): boolean {
    return code >= Resources.asciiLowerFirst && code <= Resources.asciiLowerLast;
  }

  private static isUpper(code: number): boolean {
    return code >= Resources.asciiUpperFirst && code <= Resources.asciiUpperLast;
  }

  private codeAt(index: number): number {
    return index < this.pattern.length ? this.pattern.charCodeAt(index) : -1;
  }

  private fold(code: number): number {
    return this.ignoresCase && WildcardParser.isUpper(code) ? code + Resources.asciiCaseOffset : code;
  }

  private literalOf(code: number): string {
    return ByteSet.of(t => this.fold(t) === code).toExpression();
  }

  private readPlace(): string | null {
    const code = this.codeAt(this.position);
    if (code === Resources.wildcardStar)
      return this.readStars();
    if (code === Resources.wildcardOpen)
      return this.readSet();
    this.position++;
    if (code === Resources.wildcardQuestion)
      return ByteSet.of(t => t !== Resources.wildcardSlash).toExpression();
    if (code !== Resources.wildcardBackslash)
      return this.literalOf(this.fold(code));

    const escaped = this.codeAt(this.position++);
    return escaped < 0 ? null : this.literalOf(escaped);
  }

  private readStars(): string {
    const start = this.position;
    while (this.codeAt(this.position) === Resources.wildcardStar)
      this.position++;
    const next = this.codeAt(this.position);
    const isBounded = this.position - start > 1 && (start === 0 || this.codeAt(start - 1) === Resources.wildcardSlash) &&
      (next < 0 || next === Resources.wildcardSlash || next === Resources.wildcardBackslash && this.codeAt(this.position + 1) === Resources.wildcardSlash);
    if (!isBounded)
      return Resources.anyExceptSlashPattern;
    if (next !== Resources.wildcardSlash)
      return Resources.anyPattern;

    this.position++;
    return Resources.anyFoldersPattern;
  }

  private readSet(): string | null {
    let index = this.position + 1;
    const isNegated = this.codeAt(index) === Resources.wildcardBang || this.codeAt(index) === Resources.wildcardCaret;
    if (isNegated)
      index++;
    const tests: ((code: number) => boolean)[] = [];
    let previous = 0;
    do {
      const code = this.codeAt(index);
      if (code < 0)
        return null;
      let current = code;
      if (code === Resources.wildcardBackslash) {
        const escaped = this.codeAt(++index);
        if (escaped < 0)
          return null;
        tests.push(t => t === escaped);
        current = escaped;
      } else if (code === Resources.wildcardDash && previous !== 0 && this.codeAt(index + 1) >= 0 && this.codeAt(index + 1) !== Resources.wildcardClose) {
        let last = this.codeAt(++index);
        if (last === Resources.wildcardBackslash)
          last = this.codeAt(++index);
        if (last < 0)
          return null;
        const first = previous;
        tests.push(t => t >= first && t <= last ||
          this.ignoresCase && WildcardParser.isLower(t) && t - Resources.asciiCaseOffset >= first && t - Resources.asciiCaseOffset <= last);
        current = 0;
      } else if (code === Resources.wildcardOpen && this.codeAt(index + 1) === Resources.wildcardColon) {
        const nameStart = index + Resources.posixClassOpenLength;
        let end = nameStart;
        while (end < this.pattern.length && this.codeAt(end) !== Resources.wildcardClose)
          end++;
        if (end === this.pattern.length)
          return null;
        if (end > nameStart && this.codeAt(end - 1) === Resources.wildcardColon) {
          const test = WildcardParser.CLASSES.get(this.pattern.slice(nameStart, end - 1));
          if (Object.isUndefined(test))
            return null;
          tests.push(t => test(t, this.ignoresCase));
          current = 0;
          index = end;
        } else
          tests.push(t => t === Resources.wildcardOpen);
      } else
        tests.push(t => t === code);
      previous = current;
      index++;
    } while (this.codeAt(index) !== Resources.wildcardClose);

    this.position = index + 1;
    return ByteSet.of(t => t !== Resources.wildcardSlash && tests.some(u => u(this.fold(t))) !== isNegated).toExpression();
  }
}
