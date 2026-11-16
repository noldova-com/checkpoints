/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { BigIntStats } from "node:fs";

export class StatsFixture {
  public static of(kind: "file" | "link" | "folder" | "socket", mode: bigint, size: bigint, modified: bigint, changed: bigint, inode: bigint): BigIntStats {
    const epoch = new Date(0);
    const stats: BigIntStats = {
      dev: 7n,
      ino: inode,
      mode,
      nlink: 1n,
      uid: 0n,
      gid: 0n,
      rdev: 0n,
      size,
      blksize: 0n,
      blocks: 0n,
      atimeMs: 0n,
      mtimeMs: modified / 1000000n,
      ctimeMs: changed / 1000000n,
      birthtimeMs: 0n,
      atimeNs: 0n,
      mtimeNs: modified,
      ctimeNs: changed,
      birthtimeNs: 0n,
      atime: epoch,
      mtime: epoch,
      ctime: epoch,
      birthtime: epoch,
      atimeInstant: Temporal.Instant.fromEpochNanoseconds(0n),
      mtimeInstant: Temporal.Instant.fromEpochNanoseconds(modified),
      ctimeInstant: Temporal.Instant.fromEpochNanoseconds(changed),
      birthtimeInstant: Temporal.Instant.fromEpochNanoseconds(0n),
      isFile: () => kind === "file",
      isSymbolicLink: () => kind === "link",
      isDirectory: () => kind === "folder",
      isSocket: () => kind === "socket",
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isFIFO: () => false
    };
    return stats;
  }
}
