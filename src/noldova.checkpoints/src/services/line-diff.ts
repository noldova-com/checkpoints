/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";

export class LineDiff {
  public static bodyOf(output: Buffer): Buffer {
    const start = output.indexOf(Resources.hunkStart);
    return start < 0 ? Buffer.alloc(0) : output.subarray(start + 1);
  }

  public static cut(body: Buffer, limit: number): Buffer {
    return body.length <= limit ? body : body.subarray(0, body.lastIndexOf(Resources.lineFeedByte, limit - 1) + 1);
  }

  public static ofOneSide(content: Buffer, isAdded: boolean): Buffer {
    if (content.length === 0)
      return content;

    const endsInLineFeed = content.at(-1) === Resources.lineFeedByte;
    const text = content.subarray(0, endsInLineFeed ? -1 : content.length).toString(Resources.latin1Encoding);
    const lines = text.split(Resources.lineFeed);
    const range = Resources.formatHunkRange(lines.length);
    const sign = isAdded ? Resources.addedSign : Resources.deletedSign;
    return Buffer.from([
      isAdded ? Resources.formatAddedHunk(range) : Resources.formatDeletedHunk(range),
      ...lines.map(t => `${sign}${t}${Resources.lineFeed}`),
      endsInLineFeed ? "" : Resources.noFinalLineFeedMarker
    ].join(""), Resources.latin1Encoding);
  }
}
