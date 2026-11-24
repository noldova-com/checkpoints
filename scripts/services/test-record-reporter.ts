/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { writeSync } from "node:fs";
import path from "node:path";
import type { TestEvent } from "node:test/reporters";

import "@noldova/context.core";

import { TestRecord } from "../models/test-record.ts";
import { Resources } from "../resources.ts";
import { ProcessRunner } from "./process-runner.ts";
import { TestFileWatch } from "./test-file-watch.ts";
import { TestNames } from "./test-names.ts";

export default async function* reportTestRecords(source: AsyncIterable<TestEvent>): AsyncGenerator<string> {
  const watch = new TestFileWatch(Resources.testTimeout, line => writeSync(process.stderr.fd, line),
    () => ProcessRunner.stopTree(process.pid, () => process.kill(process.pid, Resources.killSignal)));
  const names = new TestNames();
  try {
    for await (const event of source) {
      watch.observe(event);
      if (event.type === "test:dequeue")
        names.enter(event.data);
      else if ((event.type === "test:pass" || event.type === "test:fail") && !Object.isUndefined(event.data.file)) {
        const error: unknown = event.type === "test:fail" ? event.data.details.error : undefined;
        if (Object.isObject(error) && "exitCode" in error && "signal" in error)
          writeSync(process.stderr.fd, Resources.formatTestFileEnded(path.relative(process.cwd(), event.data.file).replaceAll(path.sep, Resources.pathSeparator), error.exitCode, error.signal));
        yield TestRecord.fromEvent(event.data, event.data.file, names.nameOf(event.data, event.data.file)).toLine();
      }
    }
  }
  finally {
    watch.stop();
  }
}
