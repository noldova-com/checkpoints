/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { execFile } from "node:child_process";
import { chmod } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

export class AccessFixture {
  public static readonly isRoot: boolean = process.getuid?.() === 0;
  private static readonly runAsync: (file: string, args: readonly string[]) => Promise<unknown> = promisify(execFile);

  public static async whileDeniedAsync(location: string, action: () => Promise<void>): Promise<void> {
    await AccessFixture.denyReadingAsync(location);
    try {
      await action();
    }
    finally {
      await AccessFixture.allowReadingAsync(location);
    }
  }

  public static async whileHiddenAsync(target: string, action: () => Promise<void>): Promise<void> {
    const isWindows = process.platform === "win32";
    const location = isWindows ? target : path.dirname(target);
    await (isWindows ? AccessFixture.runAsync("icacls", [location, "/deny", "*S-1-1-0:(RX)"]) : chmod(location, 0o000));
    try {
      await action();
    }
    finally {
      await (isWindows ? AccessFixture.runAsync("icacls", [location, "/remove:d", "*S-1-1-0"]) : chmod(location, 0o755));
    }
  }

  public static async denyReadingAsync(location: string): Promise<void> {
    await (process.platform === "win32" ? AccessFixture.runAsync("icacls", [location, "/deny", "*S-1-1-0:(RD)"]) : chmod(location, 0o000));
  }

  public static async allowReadingAsync(location: string): Promise<void> {
    await (process.platform === "win32" ? AccessFixture.runAsync("icacls", [location, "/remove:d", "*S-1-1-0"]) : chmod(location, 0o755));
  }

  public static async denyRemovingAsync(location: string): Promise<void> {
    await (process.platform === "win32" ? AccessFixture.runAsync("icacls", [location, "/deny", "*S-1-1-0:(OI)(CI)(DE,DC)"]) : chmod(location, 0o555));
  }

  public static async allowRemovingAsync(location: string): Promise<void> {
    await (process.platform === "win32" ? AccessFixture.runAsync("icacls", [location, "/remove:d", "*S-1-1-0"]) : chmod(location, 0o755));
  }

  public static async whileReadOnlyAsync(location: string, action: () => Promise<void>): Promise<void> {
    const isWindows = process.platform === "win32";
    await (isWindows ? AccessFixture.runAsync("icacls", [location, "/deny", "*S-1-1-0:(WD,AD)"]) : chmod(location, 0o555));
    try {
      await action();
    }
    finally {
      await (isWindows ? AccessFixture.runAsync("icacls", [location, "/remove:d", "*S-1-1-0"]) : chmod(location, 0o755));
    }
  }
}
