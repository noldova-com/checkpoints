/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { mkdtemp, readdir, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Writable } from "node:stream";

import type { UpdateProcess } from "@noldova/desktop.protocol";
import { DataDirectory, type OwnedProcess, OwnershipLock, type ProcessRequest, ProcessSupervisor, ShellDatabase, ShellMigrations } from "@noldova/desktop.runtime";

export class DesktopProcesses {
  private static readonly MODULE: string = "checkpoints";
  private static readonly PREFIX: string = "checkpoints-desktop-";
  private readonly folder: string;
  private readonly lock: OwnershipLock;
  private readonly shell: ShellDatabase;
  private readonly supervisor: ProcessSupervisor;

  public readonly diagnostics: string[] = [];

  private constructor(folder: string, lock: OwnershipLock, shell: ShellDatabase) {
    this.folder = folder;
    this.lock = lock;
    this.shell = shell;
    const diagnostics = new Writable({
      write: (chunk: unknown, _encoding, done): void => {
        this.diagnostics.push(String(chunk));
        done();
      }
    });
    this.supervisor = ProcessSupervisor.create(shell, process.platform, process.env, diagnostics);
  }

  public get recorded(): readonly UpdateProcess[] {
    return this.supervisor.updateProcesses;
  }

  public static async createAsync(): Promise<DesktopProcesses> {
    return await DesktopProcesses.openAsync(await realpath(await mkdtemp(path.join(tmpdir(), DesktopProcesses.PREFIX))));
  }

  public static async endLeftoversAsync(temporary: string): Promise<void> {
    for (const name of (await readdir(temporary)).filter(t => t.startsWith(DesktopProcesses.PREFIX))) {
      const processes = await DesktopProcesses.openAsync(path.join(temporary, name));
      try {
        await processes.supervisor.cleanUpAsync();
      }
      finally {
        await processes.disposeAsync();
      }
    }
  }

  public async startAsync(request: ProcessRequest): Promise<OwnedProcess> {
    return await this.supervisor.startAsync(DesktopProcesses.MODULE, request);
  }

  public async disposeAsync(): Promise<void> {
    await this.supervisor.stopAllAsync();
    this.shell.close();
    this.lock.release();
    await rm(this.folder, { recursive: true, force: true });
  }

  private static async openAsync(folder: string): Promise<DesktopProcesses> {
    const lock = OwnershipLock.acquire(new DataDirectory(folder));
    const shell = await ShellDatabase.openAsync(lock, ShellMigrations.all);
    return new DesktopProcesses(folder, lock, shell);
  }
}
