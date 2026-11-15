/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createReadStream, type BigIntStats } from "node:fs";
import { lstat, open, readdir, readlink, rename, stat, symlink, unlink, type link } from "node:fs/promises";
import path from "node:path";
import timers from "node:timers/promises";

import { RestoreStepFailedException } from "../exceptions/restore-step-failed.exception.ts";
import { RestoreStepException } from "../exceptions/restore-step.exception.ts";
import { Resources } from "../resources.ts";
import { Failures } from "./failures.ts";

export class RestorePaths {
  public static locationOf(folder: string, relativePath: string): string {
    return relativePath === "" ? folder : path.join(folder, ...relativePath.split(Resources.relativePathSeparator));
  }

  public static async lstatAsync(location: string): Promise<BigIntStats | null> {
    return await Failures.recoverAsync(lstat(location, { bigint: true }), t => Failures.isAbsent(t), null);
  }

  public static fileIdOf(stats: BigIntStats): string {
    return Resources.formatFileId(stats.dev, stats.ino);
  }

  public static isFolder(stats: BigIntStats | null): boolean {
    return stats !== null && stats.isDirectory() && !stats.isSymbolicLink();
  }

  public static async isEmptyFolderAsync(location: string): Promise<boolean> {
    return RestorePaths.isFolder(await RestorePaths.lstatAsync(location)) && (await readdir(location)).length === 0;
  }

  public static async hasExactNameAsync(location: string): Promise<boolean> {
    return (await readdir(path.dirname(location))).includes(path.basename(location));
  }

  public static async placeAsync(
    relativePath: string,
    from: string,
    moving: BigIntStats,
    to: string,
    taken: new (relativePath: string) => RestoreStepException,
    created: (copy: BigIntStats) => Promise<void>,
    createLink: typeof link,
    recorded: readonly (string | null)[]): Promise<void> {
    if (moving.isDirectory()) {
      await RestorePaths.retryAsync(relativePath, async () => {
        if (await RestorePaths.lstatAsync(to) !== null)
          throw new taken(relativePath);
        await rename(from, to);
      });
      return;
    }
    const own = [...recorded];
    const made = await RestorePaths.retryAsync(relativePath, async () => {
      const earlier = await RestorePaths.lstatAsync(to);
      if (earlier !== null && own.includes(RestorePaths.fileIdOf(earlier)) && RestorePaths.fileIdOf(earlier) !== RestorePaths.fileIdOf(moving))
        await unlink(to);
      return await RestorePaths.makeAsync(from, moving, to, createLink, async copy => {
        own.push(RestorePaths.fileIdOf(copy));
        await created(copy);
      });
    });
    const there = await RestorePaths.lstatAsync(to);
    if (there === null || (!made && !await RestorePaths.isSameAsync(from, moving, to, there)))
      throw new taken(relativePath);
    await RestorePaths.retryAsync(relativePath, () => unlink(from));
  }

  public static async retryAsync<T>(relativePath: string, change: () => Promise<T>): Promise<T> {
    return await RestorePaths.attemptAsync(relativePath, change, 1);
  }

  private static async makeAsync(
    from: string,
    moving: BigIntStats,
    to: string,
    createLink: typeof link,
    created: (copy: BigIntStats) => Promise<void>): Promise<boolean> {
    try {
      await (moving.isSymbolicLink() ? RestorePaths.relinkAsync(from, to, created) : RestorePaths.linkOrCopyAsync(from, moving, to, createLink, created));
      return true;
    }
    catch (error) {
      if (Failures.codeOf(error) === Resources.existsCode)
        return false;
      throw error;
    }
  }

  private static async relinkAsync(from: string, to: string, created: (copy: BigIntStats) => Promise<void>): Promise<void> {
    const target = await readlink(from);
    const pointed = await Failures.recoverAsync(stat(path.resolve(path.dirname(to), target)), t => RestorePaths.isUnresolved(t), null);
    return await symlink(target, to, pointed?.isDirectory() === true ? Resources.folderLinkType : Resources.fileLinkType)
      .then(async () => await lstat(to, { bigint: true }))
      .then(created);
  }

  private static async linkOrCopyAsync(
    from: string,
    moving: BigIntStats,
    to: string,
    createLink: typeof link,
    created: (copy: BigIntStats) => Promise<void>): Promise<void> {
    try {
      await createLink(from, to);
      return;
    }
    catch (error) {
      if (!Failures.hasCode(error, Resources.noHardLinkCodes))
        throw error;
    }
    const copy = await open(to, Resources.exclusiveWriteFlag);
    try {
      await created(await copy.stat({ bigint: true }));
    }
    catch (error) {
      await copy.close();
      await unlink(to);
      throw error;
    }
    try {
      await copy.writeFile(createReadStream(from));
      await copy.utimes(moving.atime, moving.mtime);
      await copy.chmod(Number(moving.mode & Resources.modeBits));
      await copy.sync();
    }
    finally {
      await copy.close();
    }
  }

  private static isUnresolved(error: unknown): boolean {
    return Failures.isAbsent(error) || Failures.hasCode(error, Resources.deniedCodes) || Failures.hasCode(error, Resources.changingCodes);
  }

  private static async isSameAsync(from: string, moving: BigIntStats, to: string, there: BigIntStats): Promise<boolean> {
    if (RestorePaths.fileIdOf(there) === RestorePaths.fileIdOf(moving))
      return true;
    return moving.isSymbolicLink() && there.isSymbolicLink() && await readlink(to) === await readlink(from);
  }

  private static async attemptAsync<T>(relativePath: string, change: () => Promise<T>, attempt: number): Promise<T> {
    try {
      return await change();
    }
    catch (error) {
      if (error instanceof RestoreStepException || !(error instanceof Error))
        throw error;
      if (!Failures.hasCode(error, Resources.retriedCodes) || attempt === Resources.maximumReadAttempts)
        throw new RestoreStepFailedException(relativePath, error);
    }
    await timers.setTimeout(Resources.retryDelayMilliseconds * attempt);
    return await RestorePaths.attemptAsync(relativePath, change, attempt + 1);
  }
}
