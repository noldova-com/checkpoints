/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { EventData } from "node:test";

import { Resources } from "../resources.ts";
import { TestFileWatch } from "./test-file-watch.ts";

export class TestNames {
  private readonly names: Map<string, Map<number, string>>;

  public constructor() {
    this.names = new Map<string, Map<number, string>>();
  }

  public enter(data: EventData.TestDequeue): void {
    if (data.file === undefined || TestFileWatch.fileTestOf(data) !== undefined)
      return;
    const names = this.namesOf(data.file);
    names.set(data.testId, TestNames.qualify(names, data.parentId, data.name));
  }

  public nameOf(data: EventData.TestPass | EventData.TestFail, file: string): string {
    return TestFileWatch.fileTestOf(data) !== undefined ? data.name : TestNames.qualify(this.namesOf(file), data.parentId, data.name);
  }

  private static qualify(names: ReadonlyMap<number, string>, parentId: number | undefined, name: string): string {
    const parent = parentId === undefined ? undefined : names.get(parentId);
    return parent === undefined ? name : `${parent}${Resources.testNameSeparator}${name}`;
  }

  private namesOf(file: string): Map<number, string> {
    const known = this.names.get(file);
    if (known !== undefined)
      return known;
    const names = new Map<number, string>();
    this.names.set(file, names);
    return names;
  }
}
