/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import { FreeSpace } from "../../src/services/free-space.ts";

describe("FreeSpace", { concurrency: true }, () => {
  const margin = 2 * 1024 * 1024 * 1024;
  const folderAsync = async (t: TestContext): Promise<string> => {
    const folder = await mkdtemp(path.join(tmpdir(), "free-space-"));
    t.after(() => rm(folder, { recursive: true, force: true }));
    return folder;
  };

  it("reads the space this user may write on a volume", async t => {
    const folder = await folderAsync(t);

    assert.ok(await FreeSpace.readAsync(folder) > 0);
  });

  it("needs 2 GiB beyond what the restore stages and keeps, added up on one volume, while other test files change its free space by less than 1 GiB", async t => {
    const folder = await folderAsync(t);
    const store = await folderAsync(t);
    const drift = 1024 * 1024 * 1024;
    const free = await FreeSpace.readAsync(folder);
    const room = free - margin;
    if (room <= 4 * drift) {
      t.skip("The volume has too little free beyond 2 GiB for the test to tell enough room from too little while other test files write on it.");
      return;
    }
    const fits = Math.floor((room - drift) / 2);
    const overflows = Math.ceil((room + drift) / 2);

    assert.deepEqual([
      await FreeSpace.hasRoomAsync(folder, store, 0, 0),
      await FreeSpace.hasRoomAsync(folder, store, free, 0),
      await FreeSpace.hasRoomAsync(folder, store, 0, free),
      await FreeSpace.hasRoomAsync(folder, store, fits, fits),
      await FreeSpace.hasRoomAsync(folder, store, overflows, 0),
      await FreeSpace.hasRoomAsync(folder, store, overflows, overflows)
    ], [true, false, false, true, true, false]);
  });
});
