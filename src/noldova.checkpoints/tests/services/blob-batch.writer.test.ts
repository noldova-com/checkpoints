/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, readlink, realpath, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import { PathKind } from "@noldova/checkpoints.protocol";

import { StoreObjectMissingException, StoreObjectNotABlobException, UnexpectedStoreObjectException } from "../../src/api/index.ts";
import { LinkKind } from "../../src/models/link-kind.ts";
import { StagedBlob } from "../../src/models/staged-blob.ts";
import { BlobBatchWriter } from "../../src/services/blob-batch.writer.ts";
import { FailureFixture } from "../fixtures/failure.fixture.ts";
import { LinkFixture } from "../fixtures/link.fixture.ts";

const folderAsync = async (t: TestContext): Promise<string> => {
  const folder = await mkdtemp(path.join(tmpdir(), "blob-batch-"));
  t.after(() => rm(folder, { recursive: true, force: true }));
  return folder;
};
const output = (...objects: readonly (readonly [string, string])[]): Buffer =>
  Buffer.concat(objects.map(([t, u]) => Buffer.concat([Buffer.from(`${t} blob ${Buffer.byteLength(u)}\n`), Buffer.from(u), Buffer.from("\n")])));
const first = "1".repeat(40);
const second = "2".repeat(40);

describe("BlobBatchWriter", { concurrency: true }, () => {
  it("writes each object's content to its file however the output is cut into chunks", async t => {
    const batch = output([first, "first content\nwith a line feed"], [second, ""]);
    for (let size = 1; size <= batch.length; size += 7) {
      const folder = await folderAsync(t);
      const blobs = [new StagedBlob(first, path.join(folder, "a"), PathKind.File, null), new StagedBlob(second, path.join(folder, "b"), PathKind.File, null)];
      const writer = new BlobBatchWriter(blobs);

      for (let offset = 0; offset < batch.length; offset += size)
        await writer.pushAsync(batch.subarray(offset, offset + size));
      writer.end();

      assert.equal(await readFile(path.join(folder, "a"), "utf8"), "first content\nwith a line feed", `chunks of ${size}`);
      assert.equal(await readFile(path.join(folder, "b"), "utf8"), "");
    }
  });

  it("creates a link, a file or a folder one as Windows needs, with its target as the object holds it", async t => {
    const folder = await folderAsync(t);
    await LinkFixture.requireAsync(folder);
    for (const [name, kind] of [["file-link", LinkKind.File], ["folder-link", LinkKind.Folder], ["link", null]] as const) {
      const writer = new BlobBatchWriter([new StagedBlob(first, path.join(folder, name), PathKind.Link, kind)]);

      await writer.pushAsync(output([first, "target.txt"]));
      writer.end();

      assert.equal(await readlink(path.join(folder, name)), "target.txt");
    }
  });

  it("creates an executable file with the mode that lets its owner run it", async t => {
    const folder = await folderAsync(t);
    const writer = new BlobBatchWriter([new StagedBlob(first, path.join(folder, "run.sh"), PathKind.Executable, null)]);

    await writer.pushAsync(output([first, "#!/bin/sh\n"]));
    writer.end();

    assert.equal(await readFile(path.join(folder, "run.sh"), "utf8"), "#!/bin/sh\n");
    if (process.platform !== "win32")
      assert.notEqual((await stat(path.join(folder, "run.sh"))).mode & 0o100, 0);
  });

  it("refuses an object the store doesn't hold, and output that ends early", async t => {
    const folder = await folderAsync(t);
    const missing = new BlobBatchWriter([new StagedBlob(first, path.join(folder, "a"), PathKind.File, null)]);
    const early = new BlobBatchWriter([new StagedBlob(first, path.join(folder, "b"), PathKind.File, null), new StagedBlob(second, path.join(folder, "c"), PathKind.File, null)]);

    await assert.rejects(missing.pushAsync(Buffer.from(`${first} missing\n`)), new StoreObjectMissingException(first));
    await early.pushAsync(output([first, "b"]));
    assert.throws(() => early.end(), new StoreObjectMissingException(second));
  });

  it("refuses an object the store gives when no staged file awaits one", async () => {
    await assert.rejects(new BlobBatchWriter([]).pushAsync(Buffer.from(`${first} blob 1\n`)), new UnexpectedStoreObjectException(`${first} blob 1`));
  });

  it("refuses an object of another name than the staged file awaits, and writes no file", async t => {
    const folder = await folderAsync(t);
    const writer = new BlobBatchWriter([new StagedBlob(first, path.join(folder, "a"), PathKind.File, null)]);

    await assert.rejects(writer.pushAsync(output([second, "other"])), new UnexpectedStoreObjectException(`${second} blob 5`));
    assert.deepEqual(await readdir(folder), []);
  });

  it("refuses an object the store holds as something other than file content, such as a tree, and writes no file", async t => {
    const folder = await folderAsync(t);
    const writer = new BlobBatchWriter([new StagedBlob(first, path.join(folder, "a"), PathKind.File, null)]);

    await assert.rejects(writer.pushAsync(Buffer.from(`${first} tree 0\n\n`)), new StoreObjectNotABlobException(first, `${first} tree 0`));
    assert.deepEqual(await readdir(folder), []);
  });

  it("never writes through an entry that already has the staged file's name", async t => {
    const folder = await folderAsync(t);
    const there = new BlobBatchWriter([new StagedBlob(second, path.join(folder, "a"), PathKind.File, null)]);
    await there.pushAsync(output([second, "there first"]));
    const writer = new BlobBatchWriter([new StagedBlob(first, path.join(folder, "a"), PathKind.File, null)]);

    await assert.rejects(writer.pushAsync(output([first, "new"])), { code: "EEXIST" });
    assert.equal(await readFile(path.join(folder, "a"), "utf8"), "there first");
  });

  it("closes the file being written when the output stops in the middle of it, so it can be removed at once", async t => {
    const folder = await folderAsync(t);
    const writer = new BlobBatchWriter([new StagedBlob(first, path.join(folder, "a"), PathKind.File, null)]);
    const batch = output([first, "content"]);

    await writer.pushAsync(batch.subarray(0, batch.indexOf("\n") + 3));
    await writer.closeAsync();

    assert.equal(await readFile(path.join(folder, "a"), "utf8"), "co");
    await rm(path.join(folder, "a"));
    assert.deepEqual(await readdir(folder), []);
  });

  it("keeps no descriptor of its process open on the file being written once the output stops in the middle of it", { skip: process.platform === "linux" ? false : "only Linux lists a process's open descriptors with their files, in /proc/self/fd" }, async t => {
    const folder = await folderAsync(t);
    const writer = new BlobBatchWriter([new StagedBlob(first, path.join(folder, "a"), PathKind.File, null)]);
    const batch = output([first, "content"]);
    const openOn = async (file: string): Promise<readonly string[]> => {
      const open: string[] = [];
      for (const name of await readdir("/proc/self/fd")) {
        const target = await readlink(path.join("/proc/self/fd", name)).catch((error: unknown) => {
          if (FailureFixture.hasCode(error, "ENOENT"))
            return null;
          throw error;
        });
        if (target === file)
          open.push(name);
      }
      return open;
    };

    await writer.pushAsync(batch.subarray(0, batch.indexOf("\n") + 3));
    const file = await realpath(path.join(folder, "a"));
    const whileWriting = await openOn(file);
    await writer.closeAsync();

    assert.equal(whileWriting.length, 1);
    assert.deepEqual(await openOn(file), []);
  });
});
