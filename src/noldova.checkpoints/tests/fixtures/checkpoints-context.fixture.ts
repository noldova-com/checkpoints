/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { Writable } from "node:stream";
import { mock } from "node:test";

import type { JsonValue } from "@noldova/context.json";
import type { NotificationPost, UpdateProcess } from "@noldova/desktop.protocol";
import { EventChannel, NotificationHandle, type OwnedProcess, RequestContext, type IMethodHandler, type ProcessRequest } from "@noldova/desktop.runtime";
import { FakeRuntimePartContext, type FakeModuleLog } from "@noldova/desktop.runtime/testing";

import { DesktopProcesses } from "./desktop-processes.fixture.ts";
import type { ICleanups } from "./i-cleanups.fixture.ts";
import { StartedProcess } from "./started-process.fixture.ts";

export class CheckpointsContext extends FakeRuntimePartContext {
  private readonly values: Map<string, JsonValue> = new Map([["checkpoints.followIgnoreFiles", false]]);
  private processes: Promise<DesktopProcesses> | undefined;

  public readonly events: Map<string, JsonValue[]> = new Map();
  public readonly methods: Map<string, IMethodHandler> = new Map();
  public readonly notifications: NotificationPost[] = [];
  public readonly requests: ProcessRequest[] = [];
  public readonly services: Map<string, object> = new Map();
  public readonly started: StartedProcess[] = [];
  public watchInput: (command: string, chunk: string) => void = () => undefined;
  public watchStart: (command: string, recorded: readonly UpdateProcess[]) => void = () => undefined;

  public constructor(t: ICleanups | null, moduleFolder: string) {
    super();
    this.processes = undefined;
    t?.after(async () => await this.disposeAsync());
    this.answer("moduleId", "checkpoints");
    this.answer("moduleFolder", moduleFolder);
    this.answer("registerMethod", (name, handler) => {
      this.methods.set(name, handler);
    });
    this.answer("declareEvent", name => this.channelOf(name));
    this.answer("postNotification", post => this.post(post));
    this.answer("publishService", (name, service) => {
      this.services.set(name, service);
    });
    this.answer("startProcessAsync", async request => await this.startAsync(request));
    this.settings.answer("read", name => this.settingOf(name));
    this.settings.answer("write", (name, value) => {
      this.values.set(this.nameOf(name), value);
    });
  }

  public static messagesOf(log: FakeModuleLog): readonly string[] {
    return log.callsOf("write").map(t => String(t[0]));
  }

  public get running(): readonly StartedProcess[] {
    return this.started.filter(t => t.isRunning);
  }

  public async callAsync(name: string, payload: JsonValue, signal: AbortSignal = new AbortController().signal): Promise<JsonValue> {
    const handler = this.methods.get(name);
    if (handler === undefined)
      throw new Error(`The method ${name} isn't registered.`);
    return await handler.handleAsync(new RequestContext("test", payload, signal, 1));
  }

  public async disposeAsync(): Promise<void> {
    const processes = this.processes;
    this.processes = undefined;
    if (processes !== undefined)
      await (await processes).disposeAsync();
  }

  protected async startAsync(request: ProcessRequest): Promise<OwnedProcess> {
    request.signal?.throwIfAborted();
    this.requests.push(request);
    this.processes ??= DesktopProcesses.createAsync();
    const processes = await this.processes;
    const owned = await processes.startAsync(request);
    const started = new StartedProcess(request, owned);
    this.started.push(started);
    this.watch(started.command, owned.input);
    this.watchStart(started.command, processes.recorded);
    return owned;
  }

  private watch(command: string, input: Writable): void {
    const write = input.write;
    mock.method(input, "write", (chunk: Uint8Array | string): boolean => {
      this.watchInput(command, Buffer.from(chunk).toString("latin1"));
      return write.call(input, chunk, "utf8");
    });
  }

  private channelOf(name: string): EventChannel {
    const published: JsonValue[] = [];
    this.events.set(name, published);
    return new EventChannel(t => published.push(t), () => this.events.delete(name));
  }

  private post(post: NotificationPost): NotificationHandle {
    const remove = (): void => {
      const index = this.notifications.findIndex(t => t.kind.text === post.kind.text && t.key === post.key);
      if (index >= 0)
        this.notifications.splice(index, 1);
    };
    remove();
    this.notifications.push(post);
    return new NotificationHandle(crypto.randomUUID(), () => false, remove);
  }

  private nameOf(name: string): string {
    this.settingOf(name);
    return name;
  }

  private settingOf(name: string): JsonValue {
    const value = this.values.get(name);
    if (value === undefined)
      throw new Error(`The checkpoints module declares no setting ${name}.`);
    return value;
  }
}
