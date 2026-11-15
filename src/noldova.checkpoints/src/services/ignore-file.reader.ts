/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { BigIntStats } from "node:fs";
import { lstat, open } from "node:fs/promises";

import { Resources } from "../resources.ts";
import { Failures } from "./failures.ts";

export class IgnoreFileReader {
  public static async readAsync(location: string): Promise<Buffer | null> {
    return await Failures.recoverAsync(IgnoreFileReader.readOpenedAsync(location), t => IgnoreFileReader.isPassedOver(t), null);
  }

  private static async readOpenedAsync(location: string): Promise<Buffer | null> {
    const handle = await open(location, Resources.noFollowNonBlockingReadFlags);
    try {
      const opened = await handle.stat({ bigint: true });
      if (!IgnoreFileReader.isSameFile(await lstat(location, { bigint: true }), opened))
        return null;

      const content = Buffer.allocUnsafe(Math.min(Number(opened.size) + 1, Resources.maximumIgnoreFileSize));
      let length = 0;
      let bytesRead = -1;
      while (length < content.length && bytesRead !== 0) {
        bytesRead = (await handle.read(content, length, content.length - length, length)).bytesRead;
        length += bytesRead;
      }
      return length < content.length ? content.subarray(0, length) : null;
    }
    finally {
      await handle.close();
    }
  }

  private static isSameFile(named: BigIntStats, opened: BigIntStats): boolean {
    return named.isFile() && opened.dev === named.dev && opened.ino === named.ino;
  }

  private static isPassedOver(error: unknown): boolean {
    return Failures.hasErrno(error, Resources.ignoreFileUnopenableErrnos) || Failures.isAbsent(error) || Failures.hasCode(error, Resources.ignoreFilePassedOverCodes);
  }
}
