/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from "node:path";
import type { Readable } from "node:stream";

import "@noldova/context.core";
import { ProcessRequest, type IRuntimePartContext } from "@noldova/desktop.runtime";

import { GitStoppedException } from "../exceptions/git-stopped.exception.ts";
import type { FolderStore } from "../models/folder-store.ts";
import type { GitBuild } from "../models/git-build.ts";
import type { GitLimits } from "../models/git-limits.ts";
import { ImportResult } from "../models/import-result.ts";
import type { ScheduledCall } from "../models/scheduled-call.ts";
import { Resources } from "../resources.ts";
import { Clock } from "./clock.ts";
import { CommandDeadline } from "./command-deadline.ts";
import { Failures } from "./failures.ts";
import { GitProcess } from "./git-process.ts";
import { InputWriter } from "./input-writer.ts";

export class GitRunner {
  private readonly build: GitBuild;
  private readonly clock: Clock;
  private readonly context: IRuntimePartContext;
  private readonly idleStops: Set<Promise<void>> = new Set();
  private readonly limits: GitLimits;
  private readonly live: Map<string, Map<string, GitProcess>> = new Map();
  private readonly timers: Map<string, ScheduledCall> = new Map();
  private readonly using: Map<string, number> = new Map();

  public constructor(context: IRuntimePartContext, build: GitBuild, limits: GitLimits, clock: Clock = Clock.system) {
    this.build = build;
    this.clock = clock;
    this.context = context;
    this.limits = limits;
  }

  public async batchAsync<T>(store: FolderStore, input: string, read: (output: GitProcess) => Promise<T>, signal: AbortSignal): Promise<T> {
    return await this.limitAsync(signal, this.limits.batchIdleMilliseconds, async deadline => await this.useAsync(store, Resources.catFileCommand,
      [Resources.batchCommandOption, Resources.bufferOption], "", async running => {
        const [, output] = await Promise.all([running.input.writeAsync(`${input}${Resources.batchFlush}`), read(running)]);
        return output;
      }, signal, deadline));
  }

  public async importAsync<T>(store: FolderStore, write: (input: InputWriter) => Promise<T>, signal: AbortSignal): Promise<ImportResult<T>> {
    return await this.useAsync(store, Resources.fastImportCommand, Resources.fastImportOptions, Resources.fastImportHeader, async (running): Promise<ImportResult<T>> => {
      const written = await write(running.input);
      if (running.input.isStopped) {
        await running.endAsync("", this.limits.stopMilliseconds);
        return new ImportResult(written, null);
      }
      running.input.stopMetering();
      await running.input.writeAsync(Resources.fastImportCheckpoint);
      return new ImportResult(written, await running.readLineAsync());
    }, signal, null);
  }

  public async stopStoreAsync(store: FolderStore, commands: readonly string[] = [Resources.catFileCommand, Resources.fastImportCommand]): Promise<void> {
    await this.stopFolderAsync(store.folder, commands);
  }

  public async stopAllAsync(): Promise<void> {
    await Promise.all([...this.live.keys()].map(t => this.stopFolderAsync(t, [Resources.catFileCommand, Resources.fastImportCommand])));
    await Promise.all(this.idleStops);
  }

  public async runAsync(store: FolderStore, command: string, commandArguments: readonly string[], input: Uint8Array | string, signal: AbortSignal): Promise<Buffer> {
    return await this.readAsync(store, command, commandArguments, input, t => GitRunner.readAllAsync(t), signal);
  }

  public async runLongAsync(store: FolderStore, command: string, commandArguments: readonly string[], signal: AbortSignal): Promise<Buffer> {
    return await this.readLongAsync(store, command, commandArguments, "", t => GitRunner.readAllAsync(t), signal);
  }

  public async readAsync<T>(
    store: FolderStore,
    command: string,
    commandArguments: readonly string[],
    input: Uint8Array | string,
    read: (output: Readable) => Promise<T>,
    signal: AbortSignal): Promise<T> {
    return await this.limitAsync(signal, this.limits.commandMilliseconds, async deadline => await this.executeAsync(store, command, commandArguments, input, read, signal,
      deadline.signal));
  }

  public async readLongAsync<T>(
    store: FolderStore,
    command: string,
    commandArguments: readonly string[],
    input: Uint8Array | string,
    read: (output: Readable) => Promise<T>,
    signal: AbortSignal): Promise<T> {
    return await this.executeAsync(store, command, commandArguments, input, read, signal, signal);
  }

  public async startOnceAsync(moduleFolder: string, signal: AbortSignal): Promise<number> {
    const started = this.clock.elapsed();
    return await this.limitAsync(signal, this.limits.commandMilliseconds, async deadline => {
      const program = await this.context.startProcessAsync(new ProcessRequest(this.build.program, [Resources.gitVersionArgument], this.build.execPath,
        this.isolationOf(moduleFolder, path.join(moduleFolder, Resources.emptyFile)), [], deadline.signal));
      program.input.end();
      const [exit, , errors] = await Promise.all([program.exited, GitRunner.readAllAsync(program.output), GitRunner.readAllAsync(program.errors)]);
      signal.throwIfAborted();
      if (exit.code !== 0) {
        const written = errors.toString(Resources.utf8Encoding);
        throw deadline.signal.aborted ? new GitStoppedException(Resources.gitVersionArgument, written) : GitProcess.failureOf(Resources.gitVersionArgument, exit.code, written);
      }
      return this.clock.elapsed() - started;
    });
  }

  private async executeAsync<T>(
    store: FolderStore,
    command: string,
    commandArguments: readonly string[],
    input: Uint8Array | string,
    read: (output: Readable) => Promise<T>,
    signal: AbortSignal,
    stop: AbortSignal): Promise<T> {
    const program = await this.context.startProcessAsync(
      new ProcessRequest(this.build.program, [command, ...commandArguments], store.folder, this.environmentOf(store), [], stop)).catch((error: unknown) => {
      if (signal.aborted)
        throw signal.reason;
      throw stop.aborted ? new GitStoppedException(command, "") : error;
    });
    const writer = new InputWriter(program.input);
    const writing = writer.writeAsync(input).finally(() => writer.end());
    const [exit, output, errors] = await Promise.all([
      program.exited, read(program.output), GitRunner.readAllAsync(program.errors), writing
    ]).catch(async (error: unknown) => {
      await program.stopAsync();
      await program.exited;
      if (signal.aborted)
        throw signal.reason;
      throw stop.aborted ? new GitStoppedException(command, "") : error;
    });
    if (exit.code !== 0) {
      signal.throwIfAborted();
      const written = errors.toString(Resources.utf8Encoding);
      throw stop.aborted ? new GitStoppedException(command, written) : GitProcess.failureOf(command, exit.code, written);
    }
    return output;
  }

  private async useAsync<T>(
    store: FolderStore,
    command: string,
    commandArguments: readonly string[],
    first: string,
    use: (running: GitProcess) => Promise<T>,
    signal: AbortSignal,
    deadline: CommandDeadline | null): Promise<T> {
    const stop = Object.isNull(deadline) ? signal : deadline.signal;
    if (stop.aborted)
      throw stop.reason;
    this.timers.get(store.folder)?.cancel();
    this.timers.delete(store.folder);
    this.using.set(store.folder, this.usesOf(store.folder) + 1);
    try {
      const live = this.live.get(store.folder) ?? new Map<string, GitProcess>();
      this.live.set(store.folder, live);
      let found = live.get(command);
      if (Object.isUndefined(found) || found.hasExited) {
        found = await this.startLiveAsync(store, command, commandArguments, first);
        live.set(command, found);
      }
      const running = found;
      running.begin(deadline);
      let killing: Promise<void> = Promise.resolve();
      const kill = (): void => {
        killing = running.stopAsync();
      };
      stop.addEventListener("abort", kill, { once: true });
      let failure: unknown;
      try {
        if (stop.aborted)
          throw stop.reason;
        return await use(running);
      }
      catch (error) {
        if (live.get(command) === running)
          live.delete(command);
        if (command === Resources.fastImportCommand && !stop.aborted)
          await running.endAsync("", this.limits.stopMilliseconds);
        else
          await running.stopAsync();
        failure = signal.aborted ? signal.reason : stop.aborted ? await running.stoppedAsync() : error;
      }
      finally {
        stop.removeEventListener("abort", kill);
        await killing;
      }
      throw failure;
    }
    finally {
      const using = this.usesOf(store.folder) - 1;
      if (using === 0) {
        this.using.delete(store.folder);
        if (this.live.has(store.folder))
          this.timers.set(store.folder, this.clock.schedule(() => this.stopIdle(store.folder), this.limits.idleStopMilliseconds));
      }
      else
        this.using.set(store.folder, using);
    }
  }

  private async startLiveAsync(store: FolderStore, command: string, commandArguments: readonly string[], first: string): Promise<GitProcess> {
    const program = await this.context.startProcessAsync(
      new ProcessRequest(this.build.program, [command, ...commandArguments], store.folder, this.environmentOf(store)));
    const running = new GitProcess(command, program, this.clock);
    if (first !== "")
      await running.input.writeAsync(first);
    return running;
  }

  private usesOf(folder: string): number {
    return this.using.get(folder) ?? 0;
  }

  private stopIdle(folder: string): void {
    const stopping: Promise<void> = this.stopIdleAsync(folder)
      .catch((error: unknown) => this.context.log.write(Resources.formatIdleStopFailed(folder, Failures.messageOf(error))))
      .finally(() => this.idleStops.delete(stopping));
    this.idleStops.add(stopping);
  }

  private async stopIdleAsync(folder: string): Promise<void> {
    this.timers.delete(folder);
    if (!this.using.has(folder))
      await this.stopFolderAsync(folder, [Resources.catFileCommand, Resources.fastImportCommand]);
  }

  private async stopFolderAsync(folder: string, commands: readonly string[]): Promise<void> {
    const live = this.live.get(folder);
    if (Object.isUndefined(live))
      return;
    const ending: Promise<void>[] = [];
    for (const command of commands) {
      const running = live.get(command);
      if (Object.isUndefined(running))
        continue;
      live.delete(command);
      ending.push(running.endAsync(command === Resources.fastImportCommand ? Resources.fastImportEnd : "", this.limits.stopMilliseconds));
    }
    if (live.size === 0) {
      this.live.delete(folder);
      this.timers.get(folder)?.cancel();
      this.timers.delete(folder);
    }
    await Promise.all(ending);
  }

  private environmentOf(store: FolderStore): Readonly<Record<string, string>> {
    return { [Resources.gitDirVariable]: store.gitFolder, ...this.isolationOf(store.moduleFolder, store.emptyFile) };
  }

  private isolationOf(moduleFolder: string, emptyFile: string): Readonly<Record<string, string>> {
    return {
      [Resources.gitConfigNoSystemVariable]: Resources.gitEnabledValue,
      [Resources.gitConfigGlobalVariable]: emptyFile,
      [Resources.homeVariable]: moduleFolder,
      [Resources.xdgConfigHomeVariable]: moduleFolder,
      [Resources.gitExecPathVariable]: this.build.execPath,
      [Resources.pathVariable]: this.build.path.join(path.delimiter),
      [Resources.gitTerminalPromptVariable]: Resources.gitDisabledValue,
      [Resources.gitAttrNoSystemVariable]: Resources.gitEnabledValue,
      [Resources.gitNoReplaceObjectsVariable]: Resources.gitEnabledValue,
      [Resources.localeVariable]: Resources.gitLocale
    };
  }

  private async limitAsync<T>(signal: AbortSignal, milliseconds: number, run: (deadline: CommandDeadline) => Promise<T>): Promise<T> {
    const deadline = new CommandDeadline(signal, milliseconds, this.clock);
    try {
      return await run(deadline);
    }
    finally {
      deadline.clear();
    }
  }

  private static async readAllAsync(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream)
      chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  }
}
