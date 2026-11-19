/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import { CaptureMode } from "@noldova/checkpoints.protocol";

import { FolderWalker } from "../../src/services/folder-walker.ts";
import { CancelFixture } from "../fixtures/cancel.fixture.ts";

describe("FolderWalker's cancel", () => {
  const folderAsync = async (t: TestContext): Promise<string> => {
    const folder = await realpath(await mkdtemp(path.join(tmpdir(), "walker-")));
    t.after(() => rm(folder, { recursive: true, force: true }));
    return folder;
  };

  const writeAsync = async (folder: string, relativePath: string, content: string = ""): Promise<string> => {
    const location = path.join(folder, ...relativePath.split("/"));
    await mkdir(path.dirname(location), { recursive: true });
    await writeFile(location, content);
    return location;
  };

  it("stops before its next entry once its signal aborts, inside a folder too, with the signal's reason", async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, "a.txt", "a");
    await writeAsync(folder, "b.txt", "b");
    await writeAsync(folder, "src/x.ts", "x");
    await writeAsync(folder, "src/y.ts", "y");
    const cancel = new CancelFixture(t, 4);

    await assert.rejects(new FolderWalker(process.platform).walkAsync(folder, CaptureMode.EveryFile, cancel.signal), cancel.reason);

    assert.equal(cancel.checks, 4);
  });
});
