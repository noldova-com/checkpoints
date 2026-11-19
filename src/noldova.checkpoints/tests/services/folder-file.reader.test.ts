/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import type { BigIntStats } from "node:fs";
import { link, lstat, mkdir, mkdtemp, readlink, realpath, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import { EntryKind } from "../../src/models/entry-kind.ts";
import { FolderFile } from "../../src/models/folder-file.ts";
import { ReadFailure } from "../../src/models/read-failure.ts";
import { UnhashedFile } from "../../src/models/unhashed-file.ts";
import { FolderFileReader } from "../../src/services/folder-file.reader.ts";
import { AccessFixture } from "../fixtures/access.fixture.ts";

describe("FolderFileReader", { concurrency: true }, () => {
  const foldersAsync = async (t: TestContext): Promise<[string, string]> => {
    const root = await realpath(await mkdtemp(path.join(tmpdir(), "folder-file-")));
    t.after(() => rm(root, { recursive: true, force: true }));
    await Promise.all([mkdir(path.join(root, "folder")), mkdir(path.join(root, "outside"))]);
    return [path.join(root, "folder"), path.join(root, "outside")];
  };

  const linkIdOf = (target: string | Buffer): string => createHash("sha1").update(`blob ${Buffer.byteLength(target)}\0`).update(target).digest("hex");

  const fileIdOf = (stats: BigIntStats): string => `${stats.dev}:${stats.ino}`;

  const sideAsync = async (location: string): Promise<FolderFile | UnhashedFile> => {
    const stats = await lstat(location, { bigint: true });
    return stats.isSymbolicLink()
      ? new FolderFile(EntryKind.Link, linkIdOf(await readlink(location, { encoding: "buffer" })), location, Number(stats.size), fileIdOf(stats))
      : new UnhashedFile(location, fileIdOf(stats));
  };

  it("reads a file at the top of the folder or in a folder of it, up to the bytes asked", async t => {
    const [folder] = await foldersAsync(t);
    const top = path.join(folder, "a.txt");
    const nested = path.join(folder, "sub", "b.txt");
    const large = path.join(folder, "c.bin");
    await writeFile(top, "alpha");
    await mkdir(path.dirname(nested));
    await writeFile(nested, "beta");
    await writeFile(large, Buffer.alloc(200 * 1024, "c"));

    assert.deepEqual(await FolderFileReader.readAsync(folder, await sideAsync(top), 100), Buffer.from("alpha"));
    assert.deepEqual(await FolderFileReader.readAsync(folder, new FolderFile(EntryKind.Executable, "id-1", nested, 4, fileIdOf(await lstat(nested, { bigint: true }))), 2), Buffer.from("be"));
    assert.deepEqual(await FolderFileReader.readAsync(folder, await sideAsync(large), 150 * 1024), Buffer.alloc(150 * 1024, "c"));
  });

  it("reads a file when the folder is a file system's root", async t => {
    const [folder] = await foldersAsync(t);
    const location = path.join(folder, "a.txt");
    await writeFile(location, "alpha");

    assert.deepEqual(await FolderFileReader.readAsync(path.parse(folder).root, await sideAsync(location), 10), Buffer.from("alpha"));
  });

  it("reads a link's target, and never what it points to", async t => {
    const [folder, outside] = await foldersAsync(t);
    const location = path.join(folder, "out");
    await symlink(outside, location, "junction");

    assert.deepEqual(await FolderFileReader.readAsync(folder, await sideAsync(location), 1), await readlink(location, { encoding: "buffer" }));
  });

  it("gives a file that went away as gone, and one the system won't let it read as denied", { skip: AccessFixture.isRoot ? "root reads past any file mode" : false }, async t => {
    const [folder] = await foldersAsync(t);
    const gone = path.join(folder, "gone.txt");
    const secret = path.join(folder, "secret.txt");
    await writeFile(gone, "g");
    await writeFile(secret, "s");
    const goneSide = await sideAsync(gone);
    const secretSide = await sideAsync(secret);
    await rm(gone);

    assert.equal(await FolderFileReader.readAsync(folder, goneSide, 10), ReadFailure.Gone);
    await AccessFixture.whileDeniedAsync(secret, async () => {
      assert.equal(await FolderFileReader.readAsync(folder, secretSide, 10), ReadFailure.Denied);
    });
  });

  it("gives a path that is another file, a folder or a link now as changing, never reading it", async t => {
    const [folder, outside] = await foldersAsync(t);
    const file = path.join(folder, "a.txt");
    const other = path.join(folder, "b.txt");
    const now = path.join(folder, "c");
    const out = path.join(folder, "out");
    await Promise.all([writeFile(file, "alpha"), writeFile(other, "beta"), writeFile(now, "gamma")]);
    await symlink(outside, out, "junction");
    const [fileSide, nowSide, outSide] = await Promise.all([sideAsync(file), sideAsync(now), sideAsync(out)]);
    await symlink(folder, `${out}.new`, "junction");
    await rm(file);
    await rm(now);
    await rm(out);
    await link(other, file);
    await mkdir(now);
    await rename(`${out}.new`, out);

    assert.equal(await FolderFileReader.readAsync(folder, fileSide, 10), ReadFailure.Changing);
    assert.equal(await FolderFileReader.readAsync(folder, nowSide, 10), ReadFailure.Changing);
    assert.equal(await FolderFileReader.readAsync(folder, outSide, 10), ReadFailure.Changing);
  });

  it("gives a link with the file id found but another target as changing, as a link made in place of another may be", async t => {
    const [folder, outside] = await foldersAsync(t);
    const location = path.join(folder, "out");
    await symlink(outside, location, "junction");
    const now = await sideAsync(location);
    const stats = await lstat(location, { bigint: true });
    const target = await readlink(location, { encoding: "buffer" });
    const found = new FolderFile(EntryKind.Link, linkIdOf(Buffer.from(target).reverse()), location, Number(stats.size), fileIdOf(stats));

    assert.equal(await FolderFileReader.readAsync(folder, found, 1), ReadFailure.Changing);
    assert.deepEqual(await FolderFileReader.readAsync(folder, now, 1), target);
  });

  it("gives a file whose folder now lies outside the folder as changing, though the file there is the one found", async t => {
    const [folder, outside] = await foldersAsync(t);
    const location = path.join(folder, "sub", "a.txt");
    await mkdir(path.dirname(location));
    await writeFile(location, "secret");
    const side = await sideAsync(location);
    await link(location, path.join(outside, "a.txt"));
    await rm(path.dirname(location), { recursive: true });
    await symlink(outside, path.dirname(location), "junction");

    assert.equal(await FolderFileReader.readAsync(folder, side, 10), ReadFailure.Changing);
  });

  it("gives a pipe as changing, without waiting on it", { skip: process.platform === "win32" ? "Windows has no named pipe in a folder" : false }, async t => {
    const [folder] = await foldersAsync(t);
    const location = path.join(folder, "pipe");
    execFileSync("mkfifo", [location]);

    assert.equal(await FolderFileReader.readAsync(folder, await sideAsync(location), 10), ReadFailure.Changing);
  });

  it("gives a link's object id as Git hashes its target, never what it points to", async t => {
    const [folder, outside] = await foldersAsync(t);
    const location = path.join(folder, "out");
    await symlink(outside, location, "junction");

    assert.equal(await FolderFileReader.objectIdOfAsync(location, true), linkIdOf(await readlink(location, { encoding: "buffer" })));
  });
});
