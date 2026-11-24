/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { constants, type BigIntStats } from "node:fs";
import { lstat, mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import "@noldova/context.core";
import { CaptureMode } from "@noldova/checkpoints.protocol";

import type { WalkResult } from "../../src/models/walk-result.ts";
import { FolderWalker } from "../../src/services/folder-walker.ts";

const walkAsync = async (walker: FolderWalker, folder: string, mode: CaptureMode, signal: AbortSignal = new AbortController().signal): Promise<WalkResult> => {
  const result = await walker.walkAsync(folder, mode, signal);
  assert.ok(!Object.isNull(result));
  return result;
};

describe("FolderWalker on an item of no kind it keeps", () => {
  it("leaves out an item that is no file, folder or link, as a socket is, and lists the folder that held only it as empty", async t => {
    const folder = await realpath(await mkdtemp(path.join(tmpdir(), "walker-")));
    t.after(() => rm(folder, { recursive: true, force: true }));
    await mkdir(path.join(folder, "run"));
    const location = path.join(folder, "run", "s.sock");
    await writeFile(location, "");
    const stats = await lstat(location, { bigint: true });
    const prototype: unknown = stats.constructor.prototype;
    const isTelling = (value: unknown): value is Pick<BigIntStats, "isFile"> =>
      Object.isObject(value) && "isFile" in value && Object.isFunction(value.isFile);
    assert.ok(isTelling(prototype));
    t.mock.method(prototype, "isFile", function (this: BigIntStats): boolean {
      return this.ino !== stats.ino && (this.mode & BigInt(constants.S_IFMT)) === BigInt(constants.S_IFREG);
    });

    const result = await walkAsync(new FolderWalker(process.platform), folder, CaptureMode.EveryFile, new AbortController().signal);

    assert.deepEqual(result.entries, []);
    assert.deepEqual(result.emptyFolders, ["run"]);
  });
});
