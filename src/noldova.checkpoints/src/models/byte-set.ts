/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";

export class ByteSet {
  private readonly members: boolean[];

  private constructor(members: boolean[]) {
    this.members = members;
  }

  public static of(test: (byte: number) => boolean): ByteSet {
    return new ByteSet(Array.from({ length: Resources.byteCount }, (_, byte) => byte !== 0 && test(byte)));
  }

  public toExpression(): string {
    const ranges: string[] = [];
    for (let start = 0; start < Resources.byteCount; start++) {
      if (!this.members[start])
        continue;
      let end = start;
      while (end + 1 < Resources.byteCount && this.members[end + 1] === true)
        end++;
      ranges.push(end === start ? Resources.formatHexEscape(start) : Resources.formatByteRange(start, end));
      start = end;
    }
    return ranges.length === 0 ? Resources.noMatchPattern : Resources.formatByteClass(ranges);
  }
}
