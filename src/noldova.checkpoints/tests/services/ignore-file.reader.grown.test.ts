/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { fstatSync, type BigIntStats } from "node:fs";
import { appendFile, mkdtemp, open, realpath, rm, writeFile, type FileHandle } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import "@noldova/context.core";

import { IgnoreFileReader } from "../../src/services/ignore-file.reader.ts";

const folderAsync = async (t: TestContext): Promise<string> => {
  const folder = await realpath(await mkdtemp(path.join(tmpdir(), "ignore-")));
  t.after(() => rm(folder, { recursive: true, force: true }));
  return folder;
};

describe("IgnoreFileReader on a .gitignore that grows after it opens", () => {
  const mockStat = async (t: TestContext, location: string, stat: (stats: BigIntStats) => Promise<BigIntStats>): Promise<void> => {
    const opened = await open(location);
    const prototype: unknown = opened.constructor.prototype;
    const { ino } = await opened.stat({ bigint: true });
    await opened.close();
    const isStatting = (value: unknown): value is Pick<FileHandle, "stat"> =>
      Object.isObject(value) && "stat" in value && Object.isFunction(value.stat);
    assert.ok(isStatting(prototype));

    t.mock.method(prototype, "stat", async function (this: FileHandle): Promise<BigIntStats> {
      const stats = fstatSync(this.fd, { bigint: true });
      return stats.ino === ino ? await stat(stats) : stats;
    });
  };

  it("gives no content for a .gitignore that grows after it opens", async t => {
    const location = path.join(await folderAsync(t), ".gitignore");
    await writeFile(location, "*\n");
    await mockStat(t, location, async stats => {
      await appendFile(location, "*.log\n");
      return stats;
    });

    assert.equal(await IgnoreFileReader.readAsync(location), null);
  });
});
