/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, open, realpath, rm, writeFile, type FileHandle } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import "@noldova/context.core";

import { FolderFileReader } from "../../src/services/folder-file.reader.ts";

describe("FolderFileReader's reads", () => {
  it("gives a file's object id as Git hashes its content, reading a large file 64 KiB at a time", async t => {
    const folder = await realpath(await mkdtemp(path.join(tmpdir(), "folder-file-")));
    t.after(() => rm(folder, { recursive: true, force: true }));
    const empty = path.join(folder, "empty.txt");
    const large = path.join(folder, "large.bin");
    const content = Buffer.alloc(6 * 64 * 1024 + 1, "large");
    await Promise.all([writeFile(empty, ""), writeFile(large, content)]);
    const opened = await open(empty);
    const prototype: unknown = opened.constructor.prototype;
    await opened.close();
    const isReadable = (value: unknown): value is Pick<FileHandle, "read"> =>
      Object.isObject(value) && "read" in value && Object.isFunction(value.read);
    assert.ok(isReadable(prototype));

    assert.equal(await FolderFileReader.objectIdOfAsync(empty, false), "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391");
    const read = t.mock.method(prototype, "read");
    assert.equal(await FolderFileReader.objectIdOfAsync(large, false), createHash("sha1").update(`blob ${content.length}\0`).update(content).digest("hex"));
    assert.deepEqual(read.mock.calls.map(u => u.arguments[0] instanceof Uint8Array ? u.arguments[0].length : null), Array.from({ length: 8 }, () => 64 * 1024));
  });
});
