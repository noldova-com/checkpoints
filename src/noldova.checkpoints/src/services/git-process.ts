/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { Readable } from "node:stream";

import type { OwnedProcess } from "@noldova/desktop.runtime";

import { GitExitedException } from "../exceptions/git-exited.exception.ts";
import { GitStoppedException } from "../exceptions/git-stopped.exception.ts";
import type { GitException } from "../exceptions/git.exception.ts";
import { Resources } from "../resources.ts";
import type { Clock } from "./clock.ts";
import type { CommandDeadline } from "./command-deadline.ts";
import { InputWriter } from "./input-writer.ts";

export class GitProcess {
  private readonly clock: Clock;
  private readonly errors: Buffer[] = [];
  private readonly errorsClosed: Promise<void>;
  private readonly output: Readable;
  private readonly program: OwnedProcess;
  private deadline: CommandDeadline | null = null;
  private unread: Buffer | undefined;

  public readonly command: string;
  public readonly input: InputWriter;

  public constructor(command: string, program: OwnedProcess, clock: Clock) {
    this.clock = clock;
    this.command = command;
    this.input = new InputWriter(program.input);
    this.output = program.output;
    this.program = program;
    this.unread = undefined;
    program.errors.on("data", (chunk: Buffer) => this.errors.push(Buffer.from(chunk)));
    this.errorsClosed = new Promise<void>(resolve => program.errors.once("close", resolve));
  }

  public static failureOf(command: string, exitCode: number | null, errors: string): GitException {
    return exitCode === null ? new GitStoppedException(command, errors) : new GitExitedException(command, exitCode, errors);
  }

  public get hasExited(): boolean {
    return this.program.hasExited;
  }

  public begin(deadline: CommandDeadline | null): void {
    this.deadline = deadline;
    this.errors.length = 0;
  }

  public async endAsync(last: string, limit: number): Promise<void> {
    let exited = false;
    try {
      if (!this.program.hasExited) {
        if (last !== "")
          await this.input.writeAsync(last);
        this.input.end();
      }
      exited = await this.exitsWithinAsync(limit);
    }
    finally {
      if (!exited)
        await this.program.stopAsync();
    }
    this.input.throwIfFailed();
  }

  public async nextChunkAsync(): Promise<Buffer> {
    const unread = this.unread;
    if (unread !== undefined) {
      this.unread = undefined;
      return unread;
    }
    for (;;) {
      const chunk: unknown = this.output.read();
      if (Buffer.isBuffer(chunk)) {
        this.deadline?.restart();
        return chunk;
      }
      if (this.output.readableEnded || this.output.destroyed)
        throw await this.failureAsync();
      await new Promise<void>(resolve => {
        const wake = (): void => {
          this.output.off("readable", wake);
          this.output.off("end", wake);
          this.output.off("close", wake);
          resolve();
        };
        this.output.on("readable", wake);
        this.output.on("end", wake);
        this.output.on("close", wake);
      });
    }
  }

  public async readLineAsync(): Promise<string> {
    const parts: Buffer[] = [];
    for (;;) {
      const chunk = await this.nextChunkAsync();
      const end = chunk.indexOf(Resources.lineFeedByte);
      if (end < 0) {
        parts.push(chunk);
        continue;
      }
      parts.push(chunk.subarray(0, end));
      if (end + 1 < chunk.length)
        this.unread = chunk.subarray(end + 1);
      return Buffer.concat(parts).toString(Resources.utf8Encoding);
    }
  }

  public async stopAsync(): Promise<void> {
    await this.program.stopAsync();
  }

  public async failureAsync(): Promise<GitException> {
    const exit = await this.program.exited;
    return GitProcess.failureOf(this.command, exit.code, await this.writtenErrorsAsync());
  }

  public async stoppedAsync(): Promise<GitStoppedException> {
    await this.program.exited;
    return new GitStoppedException(this.command, await this.writtenErrorsAsync());
  }

  private async exitsWithinAsync(limit: number): Promise<boolean> {
    return await this.settlesWithinAsync(this.program.exited, limit);
  }

  private async settlesWithinAsync(settling: Promise<unknown>, limit: number): Promise<boolean> {
    const { promise: late, resolve } = Promise.withResolvers<boolean>();
    const timer = this.clock.schedule(() => resolve(false), limit);
    const settled = await Promise.race([settling.then(() => true), late]);
    timer.cancel();
    return settled;
  }

  private async writtenErrorsAsync(): Promise<string> {
    const closed = await this.settlesWithinAsync(this.errorsClosed, Resources.errorsCloseMilliseconds);
    const errors = Buffer.concat(this.errors).toString(Resources.utf8Encoding);
    return closed ? errors : Resources.formatErrorsUnclosed(this.command, errors, Resources.errorsCloseMilliseconds);
  }
}
