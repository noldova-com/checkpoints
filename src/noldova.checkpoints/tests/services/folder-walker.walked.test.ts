/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { lstat, mkdir, mkdtemp, realpath, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import "@noldova/context.core";
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

describe("FolderWalker's time of a folder after its walk", () => {
  it("takes a folder's time again once it has walked what the folder holds, so a later file deleted meanwhile shows in it", async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, "big/a.ts", "a");
    const deleted = await writeAsync(folder, "z.txt", "z");
    const later = new Date(Date.now() + 3_600_000);
    ListingFixture.beforeListing(t, [() => path.join(folder, "big"), async () => {
      await rm(deleted);
      await utimes(folder, later, later);
    }]);

    const result = await new FolderWalker(process.platform).walkAsync(folder, CaptureMode.EveryFile, new AbortController().signal);

    assert.ok(!Object.isNull(result));
    assert.deepEqual(result.entries.map(u => u.path), ["big/a.ts"]);
    assert.deepEqual([...result.folderTimes.keys()], ["", "big"]);
    assert.equal(result.folderTimes.get(""), (await lstat(folder, { bigint: true })).mtimeNs);
  });
});
