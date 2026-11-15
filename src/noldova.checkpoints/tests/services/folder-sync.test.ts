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
import { describe, it } from "node:test";

import { FolderSync } from "../../src/services/folder-sync.ts";

describe("FolderSync", { concurrency: true }, () => {
  it("flushes a folder to disk, opening it to write as well as to read on Windows, which refuses to flush a folder opened only to read", async t => {
    const folder = await mkdtemp(path.join(tmpdir(), "folder-sync-"));
    t.after(() => rm(folder, { recursive: true, force: true }));
    const other = process.platform === "win32" ? "linux" : "win32";

    await new FolderSync(process.platform).syncAsync(folder);

    await assert.rejects(new FolderSync(other).syncAsync(folder), { code: process.platform === "win32" ? "EPERM" : "EISDIR" });
  });
});
