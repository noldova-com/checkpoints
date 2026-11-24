/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { EventData } from "node:test";

import "@noldova/context.core";

import { TestResultUnreadableException } from "../exceptions/test-result-unreadable.exception.ts";
import { Resources } from "../resources.ts";

export class TestRecord {
  public readonly duration: number;
  public readonly file: string;
  public readonly isSkippedWithoutReason: boolean;
  public readonly isTopLevel: boolean;
  public readonly name: string;

  public constructor(file: string, name: string, isTopLevel: boolean, duration: number, isSkippedWithoutReason: boolean) {
    this.duration = duration;
    this.file = file;
    this.isSkippedWithoutReason = isSkippedWithoutReason;
    this.isTopLevel = isTopLevel;
    this.name = name;
  }

  public static fromEvent(data: EventData.TestPass | EventData.TestFail, file: string, name: string): TestRecord {
    return new TestRecord(file, name, data.nesting === 0, data.details.duration_ms, data.skip === true);
  }

  public static parse(line: string, resultsFile: string): TestRecord {
    let value: unknown;
    try {
      value = JSON.parse(line);
    }
    catch (error) {
      if (!(error instanceof SyntaxError))
        throw error;
      throw new TestResultUnreadableException(resultsFile, line, error);
    }
    const fields = Object.isObject(value) && !Array.isArray(value) ? new Map<string, unknown>(Object.entries(value)) : new Map<string, unknown>();
    const file = fields.get(Resources.testFileField);
    const name = fields.get(Resources.testNameField);
    const isTopLevel = fields.get(Resources.testTopLevelField);
    const duration = fields.get(Resources.testDurationField);
    const isSkippedWithoutReason = fields.get(Resources.testSkippedWithoutReasonField);
    if (!Object.isString(file) || !Object.isString(name) || !Object.isBoolean(isTopLevel) || !Object.isNumber(duration) || !Object.isBoolean(isSkippedWithoutReason))
      throw new TestResultUnreadableException(resultsFile, line);
    return new TestRecord(file, name, isTopLevel, duration, isSkippedWithoutReason);
  }

  public toLine(): string {
    return Resources.formatLine(JSON.stringify({
      [Resources.testFileField]: this.file,
      [Resources.testNameField]: this.name,
      [Resources.testTopLevelField]: this.isTopLevel,
      [Resources.testDurationField]: this.duration,
      [Resources.testSkippedWithoutReasonField]: this.isSkippedWithoutReason
    }));
  }
}
