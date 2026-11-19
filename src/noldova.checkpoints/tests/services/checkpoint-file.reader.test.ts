/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { linkSync, mkdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { mkdir, readlink, rm, symlink, truncate, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import { ReadOutcome, type ReadResult } from "@noldova/checkpoints.protocol";

import type { FolderFile } from "../../src/models/folder-file.ts";
import type { UnhashedFile } from "../../src/models/unhashed-file.ts";
import { FolderFileReader } from "../../src/services/folder-file.reader.ts";
import { AccessFixture } from "../fixtures/access.fixture.ts";
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

describe("CheckpointFileReader", { concurrency: true }, () => {
  const textOf = (result: ReadResult): string => Buffer.from(result.content).toString("utf8");
  const NO_LINE_FEED = "\\ No newline at end of file\n";

  const shapesOf = (results: readonly ReadResult[]): readonly (readonly [ReadOutcome, string])[] => results.map(t => [t.outcome, textOf(t)]);

  it("reads a file's content as a checkpoint holds it, whatever the file is now, and a link's target", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "alpha");
    await harness.writeAsync("empty.txt", "");
    await mkdir(path.join(harness.folder, "real"));
    await symlink(path.join(harness.folder, "real"), path.join(harness.folder, "out"), "junction");
    const checkpoint = await harness.checkpointAsync(null);
    const target = await readlink(path.join(harness.folder, "out"), { encoding: "buffer" });
    await harness.writeAsync("a.txt", "changed");

    const file = await harness.readAsync(checkpoint, "a.txt", null);
    const empty = await harness.readAsync(checkpoint, "empty.txt", null);
    const link = await harness.readAsync(checkpoint, "out", null);

    assert.deepEqual([file.outcome, textOf(file), file.size, file.isCut], [ReadOutcome.Read, "alpha", 5, false]);
    assert.deepEqual([empty.outcome, empty.size, empty.isCut], [ReadOutcome.Read, 0, false]);
    assert.deepEqual(Buffer.from(link.content), target);
  });

  it("cuts a large file at the caller's limit and marks it cut, with the whole file's size", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const content = Buffer.alloc(3 * 1024 * 1024, "0123456789abcdef");
    await harness.writeAsync("large.txt", content);
    const checkpoint = await harness.checkpointAsync(null);

    const cut = await harness.readAsync(checkpoint, "large.txt", null, 1024 * 1024);
    const whole = await harness.readAsync(checkpoint, "large.txt", null, content.length);

    assert.deepEqual([cut.outcome, cut.content.length, cut.size, cut.isCut], [ReadOutcome.Read, 1024 * 1024, content.length, true]);
    assert.deepEqual(Buffer.from(cut.content), content.subarray(0, 1024 * 1024));
    assert.deepEqual([whole.content.length, whole.isCut], [content.length, false]);
  });

  it("gives the line diff from one checkpoint to another as Git writes it, and an empty one for a file that's the same", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "one\ntwo\nthree\n");
    await harness.writeAsync("same.txt", "same\n");
    const first = await harness.checkpointAsync(null);
    await harness.writeAsync("a.txt", "one\n2\nthree\n");
    const second = await harness.checkpointAsync(null);

    const diff = await harness.readAsync(first, "a.txt", second);
    const same = await harness.readAsync(first, "same.txt", second);

    assert.deepEqual([diff.outcome, textOf(diff), diff.isCut], [ReadOutcome.Read, "@@ -1,3 +1,3 @@\n one\n-two\n+2\n three\n", false]);
    assert.deepEqual([same.outcome, same.size], [ReadOutcome.Read, 0]);
  });

  it("gives an added or deleted file's diff as all one side, and an empty file's as none", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("old.txt", "alpha");
    await harness.writeAsync("lines.txt", "x\ny\n");
    const first = await harness.checkpointAsync(null);
    await rm(path.join(harness.folder, "old.txt"));
    await rm(path.join(harness.folder, "lines.txt"));
    await harness.writeAsync("new.txt", "x\ny\n");
    await harness.writeAsync("one.txt", "only\n");
    await harness.writeAsync("empty.txt", "");
    const second = await harness.checkpointAsync(null);
    await harness.writeAsync("now.txt", "now");

    const results = [
      await harness.readAsync(first, "old.txt", second),
      await harness.readAsync(first, "lines.txt", second),
      await harness.readAsync(first, "new.txt", second),
      await harness.readAsync(first, "one.txt", second),
      await harness.readAsync(first, "empty.txt", second),
      await harness.readAsync(second, "now.txt", "now")
    ];

    assert.deepEqual(shapesOf(results), [
      [ReadOutcome.Read, `@@ -1 +0,0 @@\n-alpha\n${NO_LINE_FEED}`],
      [ReadOutcome.Read, "@@ -1,2 +0,0 @@\n-x\n-y\n"],
      [ReadOutcome.Read, "@@ -0,0 +1,2 @@\n+x\n+y\n"],
      [ReadOutcome.Read, "@@ -0,0 +1 @@\n+only\n"],
      [ReadOutcome.Read, ""],
      [ReadOutcome.Read, `@@ -0,0 +1 @@\n+now\n${NO_LINE_FEED}`]
    ]);
  });

  it("diffs a file against the folder now by putting its content there in the store as one object, and writes nothing else", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "one\ntwo\n");
    const checkpoint = await harness.checkpointAsync(null);
    await harness.writeAsync("a.txt", "one\n2\n");
    const objects = await harness.objectCountAsync();
    const start = harness.context.requests.length;

    const diff = await harness.readAsync(checkpoint, "a.txt", "now");

    assert.deepEqual([diff.outcome, textOf(diff)], [ReadOutcome.Read, "@@ -1,2 +1,2 @@\n one\n-two\n+2\n"]);
    assert.equal(await harness.objectCountAsync(), objects + 1);
    assert.deepEqual(harness.commandsSince(start).filter(u => !["cat-file", "diff-tree", "diff"].includes(u)), ["hash-object"]);
  });

  it("diffs a link's target against the folder now's", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const out = path.join(harness.folder, "out");
    await mkdir(path.join(harness.folder, "first"));
    await mkdir(path.join(harness.folder, "second"));
    await symlink(path.join(harness.folder, "first"), out, "junction");
    const checkpoint = await harness.checkpointAsync(null);
    const before = await readlink(out);
    await unlink(out);
    await symlink(path.join(harness.folder, "second"), out, "junction");
    const after = await readlink(out);

    const diff = await harness.readAsync(checkpoint, "out", "now");

    assert.equal(textOf(diff), `@@ -1 +1 @@\n-${before}\n${NO_LINE_FEED}+${after}\n${NO_LINE_FEED}`);
  });

  it("cuts a diff at its last whole line within the limit, and gives none of a first line longer than it", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const lines = Array.from({ length: 1000 }, (_, i) => `line ${i}\n`);
    await harness.writeAsync("a.txt", lines.join(""));
    const checkpoint = await harness.checkpointAsync(null);
    await harness.writeAsync("a.txt", lines.map(u => u.toUpperCase()).join(""));

    const whole = await harness.readAsync(checkpoint, "a.txt", "now");
    const cut = await harness.readAsync(checkpoint, "a.txt", "now", 100);
    const none = await harness.readAsync(checkpoint, "a.txt", "now", 5);

    assert.equal(whole.isCut, false);
    assert.equal(textOf(whole), `@@ -1,1000 +1,1000 @@\n${lines.map(u => `-${u}`).join("")}${lines.map(u => `+${u.toUpperCase()}`).join("")}`);
    assert.deepEqual([cut.isCut, cut.size, none.isCut, none.size, none.content.length], [true, whole.size, true, whole.size, 0]);
    assert.equal(textOf(cut), `@@ -1,1000 +1,1000 @@\n${lines.slice(0, 9).map(u => `-${u}`).join("")}`);
  });

  it("reports Binary when either side isn't text: a NUL in its first bytes, or more than Git diffs", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.bin", Buffer.from([1, 0, 2]));
    await harness.writeAsync("b.txt", "b");
    await harness.writeAsync("c.txt", "c");
    const checkpoint = await harness.checkpointAsync(null);
    await harness.writeAsync("b.txt", Buffer.from([0]));
    await truncate(await harness.writeAsync("c.txt", ""), 33 * 1024 * 1024);
    await harness.writeAsync("d.bin", Buffer.from([0, 1]));

    const results = [
      await harness.readAsync(checkpoint, "a.bin", "now"),
      await harness.readAsync(checkpoint, "b.txt", "now"),
      await harness.readAsync(checkpoint, "c.txt", "now"),
      await harness.readAsync(checkpoint, "d.bin", "now"),
      await harness.readAsync(checkpoint, "a.bin", null)
    ];

    assert.deepEqual(results.map(u => [u.outcome, u.size]), [[ReadOutcome.Binary, 0], [ReadOutcome.Binary, 0], [ReadOutcome.Binary, 0], [ReadOutcome.Binary, 0], [ReadOutcome.Read, 3]]);
  });

  it("reports PathMissing for a path neither side holds as a file: absent, a folder, a .git, through a link, or not as named", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "a");
    await harness.writeAsync("lib/x.ts", "x");
    await harness.writeAsync("lib/.git", "gitdir: ../.git/modules/lib\n");
    await harness.writeAsync(".git/HEAD", "ref: refs/heads/main\n");
    await symlink(path.join(harness.folder, "lib"), path.join(harness.folder, "out"), "junction");
    await writeFile(path.join(harness.root, "outside.txt"), "outside");
    const first = await harness.checkpointAsync(null);
    const second = await harness.checkpointAsync(null);

    const results = [
      await harness.readAsync(first, "none.txt", null),
      await harness.readAsync(first, "lib", null),
      await harness.readAsync(first, ".git/HEAD", null),
      await harness.readAsync(first, "none.txt", second),
      await harness.readAsync(first, "none.txt", "now"),
      await harness.readAsync(first, "lib/.git", "now"),
      await harness.readAsync(first, ".git/HEAD", "now"),
      await harness.readAsync(first, "out/x.ts", "now"),
      await harness.readAsync(first, "none/x.ts", "now"),
      await harness.readAsync(first, "a.txt/x", "now"),
      await harness.readAsync(first, "lib", "now"),
      await harness.readAsync(first, "A.TXT", "now"),
      await harness.readAsync(first, "..\\outside.txt", "now")
    ];

    assert.deepEqual(results.map(u => u.outcome), results.map(() => ReadOutcome.PathMissing));
  });

  it("diffs a file that's now a folder as deleted", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("sub", "file\n");
    const checkpoint = await harness.checkpointAsync(null);
    await rm(path.join(harness.folder, "sub"));
    await harness.writeAsync("sub/x.txt", "x");

    const diff = await harness.readAsync(checkpoint, "sub", "now");

    assert.equal(textOf(diff), "@@ -1 +0,0 @@\n-file\n");
  });

  it("reports CheckpointMissing for either checkpoint, and for a folder never captured runs no Git", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const never = await harness.readAsync(CheckpointsHarness.unknownId, "a.txt", null);
    assert.deepEqual(harness.context.requests, []);
    await harness.writeAsync("a.txt", "a");
    const checkpoint = await harness.checkpointAsync(null);

    const results = [never, await harness.readAsync(CheckpointsHarness.unknownId, "a.txt", null), await harness.readAsync(checkpoint, "a.txt", CheckpointsHarness.unknownId)];

    assert.deepEqual(results.map(u => [u.outcome, u.size]), results.map(() => [ReadOutcome.CheckpointMissing, 0]));
  });

  it("reports the folder now missing for a diff against it, while the checkpoints still read", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "a\n");
    const first = await harness.checkpointAsync(null);
    await harness.writeAsync("a.txt", "b\n");
    const second = await harness.checkpointAsync(null);
    await rm(harness.folder, { recursive: true });

    const now = await harness.readAsync(first, "a.txt", "now");
    const content = await harness.readAsync(first, "a.txt", null);
    const between = await harness.readAsync(first, "a.txt", second);

    assert.deepEqual(shapesOf([now, content, between]), [[ReadOutcome.FolderMissing, ""], [ReadOutcome.Read, "a\n"], [ReadOutcome.Read, "@@ -1 +1 @@\n-a\n+b\n"]]);
  });

  it("reports Unknown for a path a side couldn't read, or a folder above it, never a deleted file", { skip: AccessFixture.isRoot ? "root reads past any file mode" : false }, async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const secret = await harness.writeAsync("secret.txt", "s");
    const closed = path.join(harness.folder, "closed");
    await harness.writeAsync("closed/x.txt", "x");
    await harness.writeAsync("closed/deep/y.txt", "y");
    const readable = await harness.checkpointAsync(null);

    await AccessFixture.whileDeniedAsync(secret, async () => {
      await AccessFixture.whileDeniedAsync(closed, async () => {
        await rm(path.join(harness.store, "index"));
        const unreadable = await harness.checkpointAsync(null);

        const results = [
          await harness.readAsync(unreadable, "secret.txt", null),
          await harness.readAsync(unreadable, "closed/x.txt", null),
          await harness.readAsync(unreadable, "closed/x.txt", readable),
          await harness.readAsync(readable, "secret.txt", unreadable),
          await harness.readAsync(readable, "secret.txt", "now"),
          await harness.readAsync(readable, "closed/x.txt", "now"),
          await harness.readAsync(readable, "closed/deep/y.txt", "now")
        ];

        assert.deepEqual(results.map(u => [u.outcome, u.size]), results.map(() => [ReadOutcome.Unknown, 0]));
      });
    });
  });

  it("reads names that aren't ASCII, as the file system holds them", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const names = ["日本語/ファイル.txt", "résumé.txt", "emoji-😀.txt"];
    for (const name of names)
      await harness.writeAsync(name, "one\n");
    const checkpoint = await harness.checkpointAsync(null);
    for (const name of names)
      await harness.writeAsync(name, "two\n");

    const contents = await Promise.all(names.map(u => harness.readAsync(checkpoint, u, null)));
    const diffs = await Promise.all(names.map(u => harness.readAsync(checkpoint, u, "now")));

    assert.deepEqual(contents.map(u => textOf(u)), names.map(() => "one\n"));
    assert.deepEqual(diffs.map(u => textOf(u)), names.map(() => "@@ -1 +1 @@\n-one\n+two\n"));
  });

  it("reads a name with a leading dash, and one with a line feed where the system allows it", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const names = ["-dash.txt", ...(process.platform === "win32" ? [] : ["new\nline.txt"])];
    for (const name of names)
      await harness.writeAsync(name, "one\n");
    const checkpoint = await harness.checkpointAsync(null);
    for (const name of names)
      await harness.writeAsync(name, "two\n");

    const contents = await Promise.all(names.map(u => harness.readAsync(checkpoint, u, null)));
    const diffs = await Promise.all(names.map(u => harness.readAsync(checkpoint, u, "now")));

    assert.deepEqual(contents.map(u => textOf(u)), names.map(() => "one\n"));
    assert.deepEqual(diffs.map(u => textOf(u)), names.map(() => "@@ -1 +1 @@\n-one\n+two\n"));
  });

  it("reports a checkpoint's side over 32 MiB as Binary by its size alone, never reading its content", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("large.txt", "a");
    const first = await harness.checkpointAsync(null);
    await harness.replaceFileAsync(first, "large.txt", Buffer.alloc(33 * 1024 * 1024, "a"));
    await harness.writeAsync("large.txt", "small\n");
    const second = await harness.checkpointAsync(null);
    const large = (await harness.treeAsync(first)).get("files/large.txt")?.objectId;
    const written = harness.watchCatFile();

    const now = await harness.readAsync(first, "large.txt", "now");
    const between = await harness.readAsync(second, "large.txt", first);

    assert.deepEqual([now.outcome, between.outcome], [ReadOutcome.Binary, ReadOutcome.Binary]);
    assert.deepEqual(written.filter(u => u.includes(String(large))), [`info ${String(large)}`, `info ${String(large)}`]);
  });

  describe("while the folder now changes after the path was found", { concurrency: true }, () => {
    it("reports Unknown for a file swapped for a link to a file outside the folder, and never reads or stores it", async t => {
      const { harness, checkpoint, objectId } = await startAsync(t);
      const location = path.join(harness.folder, "a.txt");
      changeWhileReading(harness, objectId, () => {
        rmSync(location);
        linkSync(path.join(harness.root, "secret.txt"), location);
      });
      const objects = await harness.objectCountAsync();

      const diff = await harness.readAsync(checkpoint, "a.txt", "now");

      assert.deepEqual([diff.outcome, diff.content.length], [ReadOutcome.Unknown, 0]);
      assert.equal(await harness.objectCountAsync(), objects);
    });

    it("reports Unknown for a file whose folder was swapped for a junction to a folder outside, though the file there is the one found", async t => {
      const { harness, checkpoint } = await startAsync(t);
      const sub = path.join(harness.folder, "sub");
      const outside = path.join(harness.root, "outside");
      const tree = await harness.treeAsync(checkpoint);
      changeWhileReading(harness, String(tree.get("files/sub/b.txt")?.objectId), () => {
        mkdirSync(outside);
        linkSync(path.join(sub, "b.txt"), path.join(outside, "b.txt"));
        writeFileSync(path.join(outside, "b.txt"), "secret\n");
        rmSync(sub, { recursive: true });
        symlinkSync(outside, sub, "junction");
      });

      const diff = await harness.readAsync(checkpoint, "sub/b.txt", "now");

      assert.deepEqual([diff.outcome, diff.content.length], [ReadOutcome.Unknown, 0]);
    });

    it("reports Unknown for a link swapped for another", async t => {
      const { harness, checkpoint } = await startAsync(t);
      const out = path.join(harness.folder, "out");
      const tree = await harness.treeAsync(checkpoint);
      changeWhileReading(harness, String(tree.get("files/out")?.objectId), () => {
        unlinkSync(out);
        symlinkSync(path.join(harness.folder, "second"), out, "junction");
      });

      assert.equal((await harness.readAsync(checkpoint, "out", "now")).outcome, ReadOutcome.Unknown);
    });

    it("reports Unknown for a file swapped for a pipe, without waiting on it", { skip: process.platform === "win32" ? "Windows has no named pipe in a folder" : false }, async t => {
      const { harness, checkpoint, objectId } = await startAsync(t);
      const location = path.join(harness.folder, "a.txt");
      changeWhileReading(harness, objectId, () => {
        rmSync(location);
        execFileSync("mkfifo", [location]);
      });

      assert.equal((await harness.readAsync(checkpoint, "a.txt", "now")).outcome, ReadOutcome.Unknown);
    });

    it("diffs a file deleted after it was found as deleted", async t => {
      const { harness, checkpoint, objectId } = await startAsync(t);
      changeWhileReading(harness, objectId, () => rmSync(path.join(harness.folder, "a.txt")));

      const diff = await harness.readAsync(checkpoint, "a.txt", "now");

      assert.deepEqual([diff.outcome, textOf(diff)], [ReadOutcome.Read, `@@ -1 +0,0 @@\n-${OLD}`]);
    });
  });
});

describe("CheckpointFileReader, alone, while the folder now changes after the path was found", () => {
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
