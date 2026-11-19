/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { mkdir, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import { ReadOutcome } from "@noldova/checkpoints.protocol";

import type { FolderFile } from "../../src/models/folder-file.ts";
import type { UnhashedFile } from "../../src/models/unhashed-file.ts";
import { FolderFileReader } from "../../src/services/folder-file.reader.ts";
import { ChangedCheckpoint } from "../fixtures/changed-checkpoint.fixture.ts";
import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";

const OLD = "one\n";

const startAsync = async (t: TestContext): Promise<ChangedCheckpoint> => {
  const harness = await CheckpointsHarness.startAsync(t);
  await harness.writeAsync("a.txt", OLD);
  await harness.writeAsync("sub/b.txt", OLD);
  await mkdir(path.join(harness.folder, "first"));
  await mkdir(path.join(harness.folder, "second"));
  await symlink(path.join(harness.folder, "first"), path.join(harness.folder, "out"), "junction");
  const checkpoint = await harness.checkpointAsync(null);
  await harness.writeAsync("a.txt", "two\n");
  await harness.writeAsync("sub/b.txt", "two\n");
  await writeFile(path.join(harness.root, "secret.txt"), "secret\n");
  const tree = await harness.treeAsync(checkpoint);
  return new ChangedCheckpoint(harness, checkpoint, String(tree.get("files/a.txt")?.objectId));
};

const changeWhileReading = (harness: CheckpointsHarness, objectId: string, change: () => void): void => {
  let isDone = false;
  harness.context.watchInput = (command, chunk) => {
    if (!isDone && command === "cat-file" && chunk.includes(objectId)) {
      isDone = true;
      change();
    }
  };
};

describe("CheckpointFileReader on a file grown while it is read", () => {
  it("reports Binary for a text file grown past 32 MiB, reading no more than a byte past what Git would diff", async t => {
    const { harness, checkpoint, objectId } = await startAsync(t);
    const location = path.join(harness.folder, "a.txt");
    const bound = 32 * 1024 * 1024 + 1;
    const reads: (readonly [number, number])[] = [];
    const readAsync = FolderFileReader.readAsync;
    t.mock.method(FolderFileReader, "readAsync", async (folder: string, file: FolderFile | UnhashedFile, keep: number) => {
      const content = await readAsync(folder, file, keep);
      if (file.location === location)
        reads.push([keep, content instanceof Buffer ? content.length : -1]);
      return content;
    });
    changeWhileReading(harness, objectId, () => writeFileSync(location, Buffer.alloc(bound, "a")));

    assert.equal((await harness.readAsync(checkpoint, "a.txt", "now")).outcome, ReadOutcome.Binary);
    assert.deepEqual(reads, [[bound, bound]]);
  });
});
