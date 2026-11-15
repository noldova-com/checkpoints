/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { lstat, mkdir, mkdtemp, readlink, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import { ChangeSide, PathKind } from "@noldova/checkpoints.protocol";

import { EntryKind } from "../../src/models/entry-kind.ts";
import { FolderFile } from "../../src/models/folder-file.ts";
import { StoredObject } from "../../src/models/stored-object.ts";
import { FolderFileReader } from "../../src/services/folder-file.reader.ts";
import { TextProbe } from "../../src/services/text-probe.ts";

describe("TextProbe", { concurrency: true }, () => {
  const folderAsync = async (t: TestContext): Promise<string> => {
    const root = await realpath(await mkdtemp(path.join(tmpdir(), "text-probe-")));
    t.after(() => rm(root, { recursive: true, force: true }));
    return root;
  };

  const sideAsync = async (kind: EntryKind, location: string): Promise<FolderFile> => {
    const stats = await lstat(location, { bigint: true });
    const objectId = await FolderFileReader.objectIdOfAsync(location, kind === EntryKind.Link);
    return new FolderFile(kind, objectId, location, Number(stats.size), `${stats.dev}:${stats.ino}`);
  };

  it("takes content as text when it's at most 32 MiB with no NUL in its first 8,000 bytes", () => {
    const late = Buffer.concat([Buffer.alloc(8_000, "a"), Buffer.from([0])]);

    assert.equal(TextProbe.isText(5, Buffer.from("alpha")), true);
    assert.equal(TextProbe.isText(late.length, late), true);
    assert.equal(TextProbe.isText(3, Buffer.from([1, 0, 2])), false);
    assert.equal(TextProbe.isText(32 * 1024 * 1024, Buffer.from("a")), true);
    assert.equal(TextProbe.isText(32 * 1024 * 1024 + 1, Buffer.from("a")), false);
  });

  it("gives a checkpoint's file as a side from its object's size and first bytes", () => {
    assert.deepEqual(TextProbe.sideOfObject(PathKind.File, new StoredObject("blob", 9_000, Buffer.from("a"))), new ChangeSide(PathKind.File, 9_000, true));
    assert.deepEqual(TextProbe.sideOfObject(PathKind.Executable, new StoredObject("blob", 2, Buffer.from([0, 1]))), new ChangeSide(PathKind.Executable, 2, false));
  });

  it("gives the folder now's file as a side from its first bytes only, and a link from its target", async t => {
    const folder = await folderAsync(t);
    const text = path.join(folder, "a.txt");
    const binary = path.join(folder, "b.bin");
    const late = path.join(folder, "c.txt");
    const link = path.join(folder, "out");
    await writeFile(text, "alpha");
    await writeFile(binary, Buffer.concat([Buffer.alloc(100, "a"), Buffer.from([0])]));
    await writeFile(late, Buffer.concat([Buffer.alloc(8_000, "a"), Buffer.from([0])]));
    await mkdir(path.join(folder, "real"));
    await symlink(path.join(folder, "real"), link, "junction");
    const target = await readlink(link, { encoding: "buffer" });

    assert.deepEqual(await TextProbe.sideOfFolderAsync(folder, await sideAsync(EntryKind.File, text)), new ChangeSide(PathKind.File, 5, true));
    assert.deepEqual(await TextProbe.sideOfFolderAsync(folder, await sideAsync(EntryKind.File, binary)), new ChangeSide(PathKind.File, 101, false));
    assert.deepEqual(await TextProbe.sideOfFolderAsync(folder, await sideAsync(EntryKind.File, late)), new ChangeSide(PathKind.File, 8_001, true));
    assert.deepEqual(await TextProbe.sideOfFolderAsync(folder, await sideAsync(EntryKind.Link, link)), new ChangeSide(PathKind.Link, target.length, true));
  });

  it("takes a file of the folder now that can't be read any more, or is another file now, as not text, with the size the walk read", async t => {
    const folder = await folderAsync(t);
    const location = path.join(folder, "a.txt");
    await writeFile(location, "alpha");
    const found = await sideAsync(EntryKind.File, location);
    const other = new FolderFile(EntryKind.File, "id-1", location, 5, "0:0");
    await rm(location);
    const gone = await TextProbe.sideOfFolderAsync(folder, found);
    await writeFile(location, "alpha");

    assert.deepEqual([gone, await TextProbe.sideOfFolderAsync(folder, other)], [new ChangeSide(PathKind.File, 5, false), new ChangeSide(PathKind.File, 5, false)]);
  });
});
