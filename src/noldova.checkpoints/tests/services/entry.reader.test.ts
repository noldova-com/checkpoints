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
import { lstat, mkdir, mkdtemp, readlink, realpath, rm, symlink, truncate, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PassThrough, Writable } from "node:stream";
import { buffer } from "node:stream/consumers";
import { describe, it, type TestContext } from "node:test";

import { UnreadPath, UnreadReason } from "@noldova/checkpoints.protocol";

import { EntryKind } from "../../src/models/entry-kind.ts";
import { IndexEntry } from "../../src/models/index-entry.ts";
import { WalkedEntry } from "../../src/models/walked-entry.ts";
import { EntryReader } from "../../src/services/entry.reader.ts";
import { InputWriter } from "../../src/services/input-writer.ts";
import { AccessFixture } from "../fixtures/access.fixture.ts";

describe("EntryReader", { concurrency: true }, () => {
  const reader = new EntryReader(process.platform);
  const idOf = (content: Buffer): string => createHash("sha1").update(`blob ${content.length}\0`).update(content).digest("hex");

  const folderAsync = async (t: TestContext): Promise<string> => {
    const root = await realpath(await mkdtemp(path.join(tmpdir(), "entry-reader-")));
    t.after(() => rm(root, { recursive: true, force: true }));
    return root;
  };

  const walkedAsync = async (location: string, kind: EntryKind): Promise<WalkedEntry> =>
    new WalkedEntry(path.basename(location), location, kind, await lstat(location, { bigint: true }));

  it("sends a file's content as fast-import reads a blob, and gives its object id as Git hashes it", async t => {
    const location = path.join(await folderAsync(t), "a.txt");
    await writeFile(location, "alpha");
    const stream = new PassThrough();
    const input = new InputWriter(stream);
    const entry = await walkedAsync(location, EntryKind.File);

    const read = await reader.readAsync(input, entry);
    input.end();

    assert.deepEqual(read, IndexEntry.of(entry, idOf(Buffer.from("alpha"))));
    assert.equal((await buffer(stream)).toString(), "blob\ndata 5\nalpha\n");
  });

  it("gives a link's object id from its target, and only hashes what a discarding input is given", async t => {
    const folder = await folderAsync(t);
    const link = path.join(folder, "out");
    await mkdir(path.join(folder, "real"));
    await symlink(path.join(folder, "real"), link, "junction");
    const entry = await walkedAsync(link, EntryKind.Link);

    const read = await reader.readAsync(InputWriter.discarding(), entry);

    assert.deepEqual(read, IndexEntry.of(entry, idOf(await readlink(link, { encoding: "buffer" }))));
  });

  it("pads a file that shrank while it was read in pieces of at most 64 KiB, then reads it again as it is now", async t => {
    const location = path.join(await folderAsync(t), "a.bin");
    await writeFile(location, "");
    await truncate(location, 4 * 64 * 1024 + 1);
    const entry = await walkedAsync(location, EntryKind.File);
    const lengths: number[] = [];
    const input = new InputWriter(new Writable({
      write: (chunk: Buffer, _encoding, done): void => {
        lengths.push(chunk.length);
        done();
      }
    }));
    let isShrunk = false;
    input.meterEvery(1, async () => {
      if (!isShrunk)
        await truncate(location, 0);
      isShrunk = true;
      return true;
    });

    const read = await reader.readAsync(input, entry);

    assert.deepEqual(read, IndexEntry.of(await walkedAsync(location, EntryKind.File), idOf(Buffer.alloc(0))));
    assert.deepEqual([lengths.filter(u => u > 1024), Math.max(...lengths)], [[64 * 1024, 64 * 1024, 64 * 1024, 64 * 1024], 64 * 1024]);
  });

  it("gives a file swapped for a pipe since the walk as changing, without waiting on it", { skip: process.platform === "win32" ? "Windows has no named pipe in a folder" : false }, async t => {
    const location = path.join(await folderAsync(t), "a.log");
    await writeFile(location, "alpha");
    const entry = await walkedAsync(location, EntryKind.File);
    await rm(location);
    execFileSync("mkfifo", [location]);

    assert.deepEqual(await reader.readAsync(InputWriter.discarding(), entry), new UnreadPath("a.log", UnreadReason.Changing, null));
  });

  it("gives nothing for a file that went away since the walk", async t => {
    const location = path.join(await folderAsync(t), "a.txt");
    await writeFile(location, "alpha");
    const entry = await walkedAsync(location, EntryKind.File);
    await rm(location);

    assert.equal(await reader.readAsync(InputWriter.discarding(), entry), null);
  });

  it("lists a file the system won't let it read as Denied", { skip: AccessFixture.isRoot ? "root reads past any file mode" : false }, async t => {
    const location = path.join(await folderAsync(t), "a.txt");
    await writeFile(location, "alpha");
    const entry = await walkedAsync(location, EntryKind.File);

    await AccessFixture.whileDeniedAsync(location, async () => {
      assert.deepEqual(await reader.readAsync(InputWriter.discarding(), entry), new UnreadPath("a.txt", UnreadReason.Denied, null));
    });
  });
});
