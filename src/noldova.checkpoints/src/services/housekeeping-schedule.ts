/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IModuleLog } from "@noldova/desktop.runtime";

import type { FolderStore } from "../models/folder-store.ts";
import type { ScheduledCall } from "../models/scheduled-call.ts";
import { Resources } from "../resources.ts";
import { Clock } from "./clock.ts";
import { Failures } from "./failures.ts";
import type { FolderQueue } from "./folder-queue.ts";
import type { StoreHousekeeping } from "./store-housekeeping.ts";

export class HousekeepingSchedule {
  private readonly clock: Clock;
  private readonly due: Set<string> = new Set();
  private readonly housekeeping: Pick<StoreHousekeeping, "runAsync">;
  private readonly log: IModuleLog;
  private readonly open: Map<string, number> = new Map();
  private readonly queue: FolderQueue;
  private readonly running: Map<string, { readonly controller: AbortController; readonly ended: Promise<void> }> = new Map();
  private stopped: boolean = false;
  private readonly timers: Map<string, ScheduledCall> = new Map();

  public constructor(queue: FolderQueue, housekeeping: Pick<StoreHousekeeping, "runAsync">, log: IModuleLog, clock: Clock = Clock.system) {
    this.clock = clock;
    this.housekeeping = housekeeping;
    this.log = log;
    this.queue = queue;
  }

  public async runAsync<T>(store: FolderStore, identity: string, writes: boolean, operation: () => Promise<T>): Promise<T> {
    this.timers.get(identity)?.cancel();
    this.timers.delete(identity);
    this.running.get(identity)?.controller.abort();
    this.open.set(identity, this.openOf(identity) + 1);
    try {
      return await operation();
    }
    finally {
      const open = this.openOf(identity) - 1;
      if (open === 0)
        this.open.delete(identity);
      else
        this.open.set(identity, open);
      if (writes)
        this.due.add(identity);
      if (open === 0 && this.due.has(identity) && !this.stopped)
        this.timers.set(identity, this.clock.schedule(() => this.start(store, identity), Resources.housekeepingDelay));
    }
  }

  public async stopAsync(): Promise<void> {
    this.stopped = true;
    for (const timer of this.timers.values())
      timer.cancel();
    this.timers.clear();
    const running = [...this.running.values()];
    for (const pass of running)
      pass.controller.abort();
    await Promise.all(running.map(t => t.ended));
  }

  private openOf(identity: string): number {
    return this.open.get(identity) ?? 0;
  }

  private start(store: FolderStore, identity: string): void {
    this.timers.delete(identity);
    const controller = new AbortController();
    const ended = this.queue.runAsync(identity, () => this.housekeeping.runAsync(store, controller.signal), controller.signal).then(() => {
      this.due.delete(identity);
    }, (error: unknown) => {
      if (controller.signal.aborted && error === controller.signal.reason)
        return;
      this.due.delete(identity);
      this.log.write(Resources.formatHousekeepingFailed(identity, Failures.messageOf(error)));
    }).finally(() => {
      if (this.running.get(identity)?.controller === controller)
        this.running.delete(identity);
    });
    this.running.set(identity, { controller, ended });
  }
}
