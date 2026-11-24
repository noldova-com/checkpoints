/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Writable } from "node:stream";

import "@noldova/context.core";

import { WriteMeter } from "../models/write-meter.ts";
import { Resources } from "../resources.ts";
import { Failures } from "./failures.ts";

export class InputWriter {
  private readonly closed: Promise<void>;
  private readonly stream: Writable;
  private checked: number = 0;
  private failure: Error | undefined;
  private meter: WriteMeter | null = null;
  private stopped: boolean = false;
  private written: number = 0;

  public constructor(stream: Writable) {
    this.stream = stream;
    this.failure = undefined;
    this.closed = new Promise(resolve => stream.once("close", () => resolve()));
    stream.on("error", (error: Error) => {
      if (!Failures.hasCode(error, Resources.closedInputCodes))
        this.failure = error;
    });
  }

  public get isStopped(): boolean {
    return this.stopped;
  }

  public static discarding(): InputWriter {
    return new InputWriter(new Writable({ write: (_chunk, _encoding, done) => done() }));
  }

  public end(): void {
    this.stream.end();
  }

  public meterEvery(interval: number, check: (written: number) => Promise<boolean>): void {
    this.checked = 0;
    this.written = 0;
    this.meter = new WriteMeter(interval, check);
  }

  public stopMetering(): void {
    this.meter = null;
  }

  public throwIfFailed(): void {
    if (!Object.isUndefined(this.failure))
      throw this.failure;
  }

  public async writeAsync(chunk: Uint8Array | string): Promise<void> {
    if (this.stopped)
      return;
    this.throwIfFailed();
    if (!this.stream.write(chunk))
      await Promise.race([new Promise<void>(resolve => this.stream.once("drain", () => resolve())), this.closed]);
    this.throwIfFailed();
    this.written += Object.isString(chunk) ? Buffer.byteLength(chunk) : chunk.length;
    if (!Object.isNull(this.meter) && this.written - this.checked >= this.meter.interval) {
      this.checked = this.written;
      if (!await this.meter.check(this.written)) {
        this.stopped = true;
        this.meter = null;
      }
    }
  }
}
