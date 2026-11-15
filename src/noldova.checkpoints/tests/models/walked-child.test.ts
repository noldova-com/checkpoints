/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { lstat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { describe, it } from "node:test";

import { WalkedChild } from "../../src/models/walked-child.ts";

describe("WalkedChild", { concurrency: true }, () => {
  it("holds what lstat gave for a child of a folder and, for a folder, the names it lists", async () => {
    const stats = await lstat(tmpdir(), { bigint: true });
    const names = [Buffer.from("a.txt")];

    const child = new WalkedChild(stats, names);

    assert.deepEqual([child.stats, child.names], [stats, names]);
  });
});
