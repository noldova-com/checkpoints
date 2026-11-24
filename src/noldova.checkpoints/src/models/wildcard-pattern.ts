/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "@noldova/context.core";

import { WildcardParser } from "../services/wildcard.parser.ts";

export class WildcardPattern {
  private readonly expression: RegExp | null;

  public constructor(pattern: string, ignoresCase: boolean) {
    const source = new WildcardParser(pattern, ignoresCase).parse();
    this.expression = Object.isNull(source) ? null : new RegExp(source);
  }

  public matches(text: string): boolean {
    return !Object.isNull(this.expression) && this.expression.test(text);
  }
}
