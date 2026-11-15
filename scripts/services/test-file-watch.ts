/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from "node:path";
import type { EventData } from "node:test";
import type { TestEvent } from "node:test/reporters";

import { Resources } from "../resources.ts";

export class TestFileWatch {
  private readonly end: () => void;
  private readonly limit: number;
  private readonly report: (line: string) => void;
  private readonly running: Set<string>;
  private timer: NodeJS.Timeout | undefined;

  public constructor(limit: number, report: (line: string) => void, end: () => void) {
    this.end = end;
    this.limit = limit;
    this.report = report;
    this.running = new Set<string>();
    this.timer = undefined;
  }

  public static fileTestOf(data: EventData.TestDequeue | EventData.TestComplete | EventData.TestPass | EventData.TestFail): string | undefined {
    return data.nesting === 0 && data.file !== undefined && path.resolve(data.name) === data.file ? data.file : undefined;
  }

  public observe(event: TestEvent): void {
    const file = event.type === "test:dequeue" || event.type === "test:complete" ? TestFileWatch.fileTestOf(event.data) : undefined;
    if (file !== undefined && event.type === "test:dequeue")
      this.running.add(file);
    else if (file !== undefined)
      this.running.delete(file);
    clearTimeout(this.timer);
    this.timer = this.running.size === 0 ? undefined : setTimeout(() => this.nameRunning(), this.limit).unref();
  }

  public stop(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  private nameRunning(): void {
    for (const file of [...this.running].sort())
      this.report(Resources.formatTestFileHung(path.relative(process.cwd(), file).replaceAll(path.sep, Resources.pathSeparator), this.limit));
    this.running.clear();
    this.timer = undefined;
    this.end();
  }
}
