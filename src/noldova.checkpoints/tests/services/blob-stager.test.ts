/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { mkdir, readdir, readFile, readlink, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { PathKind, type Checkpoint } from "@noldova/checkpoints.protocol";

import { StoreObjectMissingException } from "../../src/api/index.ts";
import { FolderStore } from "../../src/models/folder-store.ts";
import { LinkKind } from "../../src/models/link-kind.ts";
import { StagedBlob } from "../../src/models/staged-blob.ts";
import { BlobStager } from "../../src/services/blob-stager.ts";
import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";
import { LinkFixture } from "../fixtures/link.fixture.ts";

describe("BlobStager", { concurrency: true }, () => {
  const storeOf = (harness: CheckpointsHarness): FolderStore => new FolderStore(harness.context.moduleFolder, CheckpointsHarness.identity);
  const idOfAsync = async (harness: CheckpointsHarness, checkpoint: Checkpoint, relativePath: string): Promise<string> =>
    (await harness.gitAsync(["rev-parse", `refs/checkpoints/${checkpoint.id}:files/${relativePath}`])).toString("utf8").trim();

  it("writes each object's content from the store to its own staged file, asking cat-file --batch --buffer for all of them at once", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "alpha");
    await harness.writeAsync("b.txt", "beta");
    const checkpoint = await harness.checkpointAsync(null);
    const first = await idOfAsync(harness, checkpoint, "a.txt");
    const second = await idOfAsync(harness, checkpoint, "b.txt");
    const stager = new BlobStager(await harness.createGitRunnerAsync());
    const start = harness.context.requests.length;
    const written = harness.watchCatFile();

    await stager.stageAsync(storeOf(harness), [
      new StagedBlob(first, path.join(harness.root, "a"), PathKind.File, null),
      new StagedBlob(second, path.join(harness.root, "b"), PathKind.File, null)
    ]);

    assert.deepEqual(await Promise.all(["a", "b"].map(u => readFile(path.join(harness.root, u), "utf8"))), ["alpha", "beta"]);
    assert.deepEqual(harness.context.requests.slice(start).filter(u => u.arguments[0] === "cat-file").map(u => u.arguments.join(" ")), ["cat-file --batch --buffer"]);
    assert.deepEqual(written, [first, second]);
  });

  it("runs no Git and writes nothing when there is nothing to stage", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.checkpointAsync(null);
    const stager = new BlobStager(await harness.createGitRunnerAsync());
    const start = harness.context.requests.length;
    const before = await readdir(harness.root);

    await stager.stageAsync(storeOf(harness), []);

    assert.deepEqual(harness.context.requests.slice(start), []);
    assert.deepEqual(await readdir(harness.root), before);
  });

  it("fails naming an object the store doesn't hold, once it has staged the ones ahead of it", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "alpha");
    const first = await idOfAsync(harness, await harness.checkpointAsync(null), "a.txt");
    const missing = "0".repeat(first.length);
    const stager = new BlobStager(await harness.createGitRunnerAsync());

    const staging = stager.stageAsync(storeOf(harness), [
      new StagedBlob(first, path.join(harness.root, "a"), PathKind.File, null),
      new StagedBlob(missing, path.join(harness.root, "b"), PathKind.File, null)
    ]);

    await assert.rejects(staging, new StoreObjectMissingException(missing));
    assert.equal(await readFile(path.join(harness.root, "a"), "utf8"), "alpha");
    assert.equal((await readdir(harness.root)).includes("b"), false);
  });

  it("creates a staged file only where nothing is, letting its owner run it only when it is executable", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const file = new StagedBlob("a".repeat(40), path.join(harness.root, "file"), PathKind.File, null);
    const executable = new StagedBlob("b".repeat(40), path.join(harness.root, "run.sh"), PathKind.Executable, null);

    for (const blob of [file, executable])
      await (await BlobStager.createAsync(blob)).close();

    await assert.rejects(BlobStager.createAsync(file), { code: "EEXIST" });
    if (process.platform !== "win32")
      assert.deepEqual([(await stat(file.location)).mode & 0o100, (await stat(executable.location)).mode & 0o100], [0, 0o100]);
  });

  it("links to the target the object holds, as a folder link for a folder and a file link otherwise", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await mkdir(path.join(harness.root, "target-folder"));
    await writeFile(path.join(harness.root, "target-folder", "x.txt"), "x");
    await writeFile(path.join(harness.root, "target.txt"), "t");
    const folderLink = new StagedBlob("a".repeat(40), path.join(harness.root, "folder-link"), PathKind.Link, LinkKind.Folder);
    const fileLink = new StagedBlob("b".repeat(40), path.join(harness.root, "file-link"), PathKind.Link, LinkKind.File);
    const plainLink = new StagedBlob("c".repeat(40), path.join(harness.root, "link"), PathKind.Link, null);
    await LinkFixture.requireAsync(harness.root);

    await BlobStager.linkAsync(folderLink, Buffer.from("target-folder"));
    await BlobStager.linkAsync(fileLink, Buffer.from("target.txt"));
    await BlobStager.linkAsync(plainLink, Buffer.from("target.txt"));
    assert.deepEqual(await Promise.all([folderLink, fileLink, plainLink].map(u => readlink(u.location))), ["target-folder", "target.txt", "target.txt"]);
    assert.deepEqual(await readdir(folderLink.location), ["x.txt"]);
    assert.deepEqual(await Promise.all([fileLink, plainLink].map(u => readFile(u.location, "utf8"))), ["t", "t"]);
  });
});
