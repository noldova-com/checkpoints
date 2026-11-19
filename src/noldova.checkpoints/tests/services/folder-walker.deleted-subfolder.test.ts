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
import { ListingFixture } from "../fixtures/listing.fixture.ts";

const folderAsync = async (t: TestContext): Promise<string> => {
  const folder = await realpath(await mkdtemp(path.join(tmpdir(), "walker-")));
  t.after(() => rm(folder, { recursive: true, force: true }));
  return folder;
};
const writeAsync = async (folder: string, relativePath: string, content: string): Promise<string> => {
  const location = path.join(folder, ...relativePath.split("/"));
  await mkdir(path.dirname(location), { recursive: true });
  await writeFile(location, content);
  return location;
};

describe("FolderWalker on a subfolder deleted while it walks", () => {
  it("keeps no time for a folder deleted while it walks what the folder holds, so the folder above it decides", async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, "sub/inner/x.ts", "x");
    ListingFixture.beforeListing(t, [() => path.join(folder, "sub", "inner"), async () => await rm(path.join(folder, "sub"), { recursive: true })]);

    const result = await new FolderWalker(process.platform).walkAsync(folder, CaptureMode.EveryFile, new AbortController().signal);

    assert.ok(result !== null);
    assert.deepEqual(result.entries, []);
    assert.deepEqual([...result.folderTimes.keys()], [""]);
  });
});
