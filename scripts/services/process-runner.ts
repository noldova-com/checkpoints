/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { type ChildProcess, spawn } from "node:child_process";

import "@noldova/context.core";

import { ProcessNotStartedException } from "../exceptions/process-not-started.exception.ts";
import { ProcessNotStoppedException } from "../exceptions/process-not-stopped.exception.ts";
import { ProcessOutputTooLongException } from "../exceptions/process-output-too-long.exception.ts";
import { ProcessTimeoutException } from "../exceptions/process-timeout.exception.ts";
import type { ProcessException } from "../exceptions/process.exception.ts";
import { ProcessResult } from "../models/process-result.ts";
import { Resources } from "../resources.ts";
import { ErrorCode } from "./error-code.ts";

export class ProcessRunner {
  public static exitCodeOf(code: number | null, signal: NodeJS.Signals | null): number {
    return code ?? (Object.isNull(signal) ? 1 : Resources.signalExitCode);
  }

  public static stopTree(processId: number, fallback: () => void): void {
    if (process.platform === Resources.windowsPlatform) {
      spawn(Resources.taskKillProgram, Resources.formatTaskKillArguments(processId), { stdio: Resources.ignoredOutput, windowsHide: true }).once("error", fallback);
      return;
    }
    try {
      process.kill(-processId, Resources.killSignal);
    }
    catch (error) {
      if (ErrorCode.of(error) !== Resources.noProcessCode)
        throw error;
      fallback();
    }
  }

  public captureAsync(command: string, commandArguments: readonly string[], directory: string, timeout: number, environment?: NodeJS.ProcessEnv): Promise<ProcessResult> {
    const child = spawn(command, [...commandArguments], {
      cwd: directory,
      detached: process.platform !== Resources.windowsPlatform,
      shell: false,
      stdio: [Resources.ignoredOutput, Resources.pipedOutput, Resources.pipedOutput],
      windowsHide: true,
      env: environment ?? process.env
    });
    const output: Buffer[] = [];
    const errorOutput: Buffer[] = [];
    let size = 0;
    return ProcessRunner.superviseAsync(child, command, timeout, stop => {
      const receive = (chunks: Buffer[], chunk: Buffer): void => {
        size += chunk.length;
        if (size > Resources.processOutputLimit)
          stop(new ProcessOutputTooLongException(command, Resources.processOutputLimit));
        else
          chunks.push(chunk);
      };
      child.stdout.on("data", (t: Buffer) => receive(output, t));
      child.stderr.on("data", (t: Buffer) => receive(errorOutput, t));
    }, code => new ProcessResult(code, Buffer.concat(output).toString(Resources.utf8Encoding), Buffer.concat(errorOutput).toString(Resources.utf8Encoding)));
  }

  public runAsync(program: string, parameters: readonly string[], folder: string, timeout: number | undefined, environment?: NodeJS.ProcessEnv): Promise<number> {
    const child = spawn(program, [...parameters], {
      cwd: folder,
      detached: process.platform !== Resources.windowsPlatform,
      stdio: Resources.inheritedOutput,
      env: environment ?? process.env
    });
    return ProcessRunner.superviseAsync(child, program, timeout, () => undefined, (code, signal) => ProcessRunner.exitCodeOf(code, signal));
  }

  private static superviseAsync<T>(child: ChildProcess, command: string, timeout: number | undefined, watch: (stop: (failure: ProcessException) => void) => void,
    finish: (code: number | null, signal: NodeJS.Signals | null) => T): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let failure: ProcessException | null = null;
      let interrupted: NodeJS.Signals | undefined;
      let stopWait: NodeJS.Timeout | undefined;
      const forward = (signal: NodeJS.Signals): void => {
        interrupted = signal;
        ProcessRunner.stopChild(child);
      };
      const release = (): void => {
        clearTimeout(deadline);
        clearTimeout(stopWait);
        for (const signal of Resources.forwardedSignals)
          process.off(signal, forward);
      };
      const stop = (reason: ProcessException): void => {
        if (!Object.isNull(failure))
          return;
        failure = reason;
        ProcessRunner.stopChild(child);
        stopWait = setTimeout(() => {
          release();
          reject(new ProcessNotStoppedException(command, Resources.processStopWait, reason));
        }, Resources.processStopWait);
      };
      const deadline = Object.isUndefined(timeout) ? undefined : setTimeout(() => stop(new ProcessTimeoutException(command, timeout)), timeout);
      for (const signal of Resources.forwardedSignals)
        process.on(signal, forward);
      watch(stop);
      child.once("error", t => {
        if (!Object.isUndefined(child.pid)) {
          stop(new ProcessNotStartedException(command, t));
          return;
        }
        release();
        reject(new ProcessNotStartedException(command, t));
      });
      child.once("close", (code, signal) => {
        release();
        if (!Object.isUndefined(interrupted))
          process.kill(process.pid, interrupted);
        else if (Object.isNull(failure))
          resolve(finish(code, signal));
        else
          reject(failure);
      });
    });
  }

  private static stopChild(child: ChildProcess): void {
    const pid = child.pid;
    if (!Object.isUndefined(pid))
      ProcessRunner.stopTree(pid, () => child.kill(Resources.killSignal));
  }
}
