/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { appendFileSync, mkdirSync, renameSync, rmSync, truncateSync, unlinkSync } from "node:fs";
import { chmod, lstat, mkdir, readFile, readlink, rm, symlink, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { CaptureMode, CaptureOutcome, CaptureRequest, KeepReason, KeptPath, UnreadPath, UnreadReason, type CaptureResult, type Checkpoint } from "@noldova/checkpoints.protocol";

import { GitExitedException } from "../../src/api/index.ts";
import { AccessFixture } from "../fixtures/access.fixture.ts";
import { CaseFixture } from "../fixtures/case.fixture.ts";
import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";
import { JsonFixture } from "../fixtures/json.fixture.ts";
import { ServiceSeams } from "../fixtures/service-seams.fixture.ts";

describe("CheckpointCapture", { concurrency: true }, () => {
  const watchContents = (harness: CheckpointsHarness, action: (count: number) => void): void => {
    let count = 0;
    harness.context.watchInput = (command, chunk) => {
      if (command === "fast-import" && chunk.startsWith("blob\ndata "))
        action(++count);
    };
  };

  const earlierPathsAsync = async (harness: CheckpointsHarness, checkpoint: Checkpoint): Promise<readonly unknown[]> =>
    JsonFixture.listOf(JsonFixture.parse((await harness.contentAsync(checkpoint, "checkpoint.json")).toString())["earlierPaths"]);

  it("reports a folder whose path is missing, or isn't a folder, and keeps no store for it", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await rm(harness.folder, { recursive: true });
    const missing = await harness.captureAsync(null);
    await writeFile(harness.folder, "a file");
    const file = await harness.captureAsync(null);

    assert.deepEqual([missing.outcome, missing.checkpoint, file.outcome], [CaptureOutcome.FolderMissing, null, CaptureOutcome.FolderMissing]);
    assert.deepEqual(harness.context.requests, []);
  });

  it("keeps every file under files/ but each .git, with the checkpoint and its record beside them", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "alpha");
    await harness.writeAsync(".git/HEAD", "ref: refs/heads/main\n");
    await harness.writeAsync("lib/.git", "gitdir: ../.git/modules/lib\n");
    await harness.writeAsync("lib/x.ts", "x");
    await harness.writeAsync(".git~", "kept");
    await harness.writeAsync("src/empty.txt", "");
    await mkdir(path.join(harness.folder, "logs"));

    const checkpoint = await harness.checkpointAsync("Turn 3");

    const tree = await harness.treeAsync(checkpoint);
    assert.deepEqual([...tree.keys()].sort(), ["checkpoint.json", "files/.git~", "files/a.txt", "files/lib/x.ts", "files/src/empty.txt"]);
    assert.equal((await harness.contentAsync(checkpoint, "files/a.txt")).toString(), "alpha");
    assert.equal((await harness.contentAsync(checkpoint, "files/.git~")).toString(), "kept");
    assert.equal(tree.get("files/a.txt")?.mode, "100644");
    assert.deepEqual(JSON.parse((await harness.contentAsync(checkpoint, "checkpoint.json")).toString()), {
      formatVersion: 3, checkpoint: checkpoint.toJson(), emptyFolders: ["logs"], links: [], ignoreRules: null, earlierPaths: []
    });
    assert.equal(checkpoint.label, "Turn 3");
    assert.equal(checkpoint.mode, CaptureMode.EveryFile);
    assert.equal(checkpoint.time.getTime(), harness.clock.now());
  });

  it("names the module as the commit's author and committer, with the capture's time, and the checkpoint in its message", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const checkpoint = await harness.checkpointAsync(null);

    const commit = (await harness.gitAsync(["cat-file", "commit", `refs/checkpoints/${checkpoint.id}`])).toString("utf8");
    const seconds = Math.floor(checkpoint.time.getTime() / 1000);

    assert.match(commit, new RegExp(`\\nauthor Checkpoints <checkpoints@noldova\\.invalid> ${seconds} \\+0000\\n`));
    assert.match(commit, new RegExp(`\\ncommitter Checkpoints <checkpoints@noldova\\.invalid> ${seconds} \\+0000\\n`));
    assert.match(commit, new RegExp(`\\n\\nCheckpoint ${checkpoint.id}$`));
  });

  it("keeps a link as a link, with its target", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await mkdir(path.join(harness.folder, "real"));
    await symlink(path.join(harness.folder, "real"), path.join(harness.folder, "out"), "junction");

    const checkpoint = await harness.checkpointAsync(null);
    const tree = await harness.treeAsync(checkpoint);
    const target = await readlink(path.join(harness.folder, "out"), { encoding: "buffer" });

    assert.equal(tree.get("files/out")?.mode, "120000");
    assert.deepEqual(await harness.contentAsync(checkpoint, "files/out"), target);
  });

  it("keeps a file its owner may run as executable", { skip: process.platform === "win32" ? "Windows keeps no executable bit" : false }, async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await chmod(await harness.writeAsync("run.sh", "#!/bin/sh\n"), 0o755);

    const tree = await harness.treeAsync(await harness.checkpointAsync(null));

    assert.equal(tree.get("files/run.sh")?.mode, "100755");
  });

  it("writes the index with each file's metadata and object, and the folder's path, once the checkpoint exists", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const location = await harness.writeAsync("a.txt", "alpha");

    const checkpoint = await harness.checkpointAsync(null);
    const tree = await harness.treeAsync(checkpoint);
    const stats = await lstat(location, { bigint: true });
    const index = await harness.readStoreFileAsync("index");

    assert.equal(index["start"], String(harness.clock.fileTime()));
    assert.deepEqual(index["entries"], [{
      path: "a.txt",
      kind: "File",
      size: "5",
      modified: String(stats.mtimeNs),
      changed: String(stats.ctimeNs),
      fileId: `${stats.dev}:${stats.ino}`,
      objectId: tree.get("files/a.txt")?.objectId
    }]);
    assert.deepEqual(await harness.readStoreFileAsync("folder.json"), { formatVersion: 1, path: harness.folder });
  });

  it("names the object the index holds for a file it still vouches for, without reading the file again", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "alpha");
    await harness.writeAsync("b.txt", "beta");
    const first = await harness.checkpointAsync(null);
    const tree = await harness.treeAsync(first);
    const index = await harness.readStoreFileAsync("index");
    const later = CheckpointsHarness.vouchingStartOf(index);
    const entries = JsonFixture.objectsOf(index["entries"]).map(u => u["path"] === "a.txt" ? { ...u, objectId: tree.get("files/b.txt")?.objectId } : u);
    await writeFile(path.join(harness.store, "index"), JSON.stringify({ formatVersion: 1, start: later, entries }));
    let sent = 0;
    watchContents(harness, () => sent++);

    const second = await harness.checkpointAsync(null);

    assert.equal(sent, 0);
    assert.equal((await harness.contentAsync(second, "files/a.txt")).toString(), "beta");
  });

  it("reads again a file rewritten since the last capture, at the same size", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const location = await harness.writeAsync("a.txt", "alpha");
    await harness.checkpointAsync(null);
    const index = await harness.readStoreFileAsync("index");
    await writeFile(path.join(harness.store, "index"), JSON.stringify({ ...index, start: CheckpointsHarness.vouchingStartOf(index) }));
    await writeFile(location, "omega");

    const second = await harness.checkpointAsync(null);

    assert.equal((await harness.contentAsync(second, "files/a.txt")).toString(), "omega");
  });

  it("reads a file again when it turns out longer or shorter than the walk read, and keeps it as it then stays", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const longer = await harness.writeAsync("a.txt", "alpha");
    const shorter = await harness.writeAsync("b.txt", "beta");
    watchContents(harness, count => {
      if (count === 1)
        appendFileSync(longer, " and more");
      if (count === 3)
        truncateSync(shorter, 2);
    });

    const checkpoint = await harness.checkpointAsync(null);

    assert.equal((await harness.contentAsync(checkpoint, "files/a.txt")).toString(), "alpha and more");
    assert.equal((await harness.contentAsync(checkpoint, "files/b.txt")).toString(), "be");
    assert.deepEqual(checkpoint.unreadPaths, []);
  });

  it("reads a file again when it changed between the walk and its reading", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "alpha");
    const changed = await harness.writeAsync("b.txt", "beta");
    watchContents(harness, count => {
      if (count === 1)
        appendFileSync(changed, "!");
    });

    const checkpoint = await harness.checkpointAsync(null);

    assert.equal((await harness.contentAsync(checkpoint, "files/b.txt")).toString(), "beta!");
  });

  it("lists a file that changes at each of three readings as Changing, and keeps no content for it", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const location = await harness.writeAsync("busy.log", "line\n");
    watchContents(harness, () => appendFileSync(location, "line\n"));

    const checkpoint = await harness.checkpointAsync(null);

    assert.deepEqual(checkpoint.unreadPaths, [new UnreadPath("busy.log", UnreadReason.Changing, null)]);
    assert.equal((await harness.treeAsync(checkpoint)).has("files/busy.log"), false);
    assert.deepEqual((await harness.readStoreFileAsync("index"))["entries"], []);
  });

  it("lists a file that became something else while it was read as Changing", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const location = await harness.writeAsync("a.txt", "alpha");
    watchContents(harness, () => {
      appendFileSync(location, "!");
      renameSync(location, `${location}.old`);
      mkdirSync(location);
    });

    const checkpoint = await harness.checkpointAsync(null);

    assert.deepEqual(checkpoint.unreadPaths, [new UnreadPath("a.txt", UnreadReason.Changing, null)]);
  });

  it("leaves out a file or a link that went away before it was read, or while it was read and changed", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const moved = await harness.writeAsync("a.txt", "alpha");
    const deleted = await harness.writeAsync("b.txt", "beta");
    await mkdir(path.join(harness.folder, "real"));
    await symlink(path.join(harness.folder, "real"), path.join(harness.folder, "c"), "junction");
    watchContents(harness, count => {
      if (count === 1) {
        renameSync(moved, path.join(harness.root, "a.txt"));
        appendFileSync(path.join(harness.root, "a.txt"), "!");
        rmSync(deleted);
        unlinkSync(path.join(harness.folder, "c"));
      }
    });

    const checkpoint = await harness.checkpointAsync(null);

    assert.deepEqual([...(await harness.treeAsync(checkpoint)).keys()], ["checkpoint.json"]);
    assert.deepEqual(checkpoint.unreadPaths, []);
  });

  it("lists a file the system won't let it read as Denied, and keeps the rest", { skip: AccessFixture.isRoot ? "root reads past any file mode" : false }, async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const secret = await harness.writeAsync("secret.txt", "s");
    await harness.writeAsync("open.txt", "o");

    await AccessFixture.whileDeniedAsync(secret, async () => {
      const checkpoint = await harness.checkpointAsync(null);

      assert.deepEqual(checkpoint.unreadPaths, [new UnreadPath("secret.txt", UnreadReason.Denied, null)]);
      assert.deepEqual([...(await harness.treeAsync(checkpoint)).keys()].sort(), ["checkpoint.json", "files/open.txt"]);
    });
  });

  it("keeps the paths the walk couldn't read with those the reading couldn't", { skip: AccessFixture.isRoot ? "root reads past any file mode" : false }, async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("closed/x.txt", "x");
    const location = await harness.writeAsync("z.log", "z");
    watchContents(harness, () => appendFileSync(location, "z"));

    await AccessFixture.whileDeniedAsync(path.join(harness.folder, "closed"), async () => {
      const checkpoint = await harness.checkpointAsync(null);

      assert.deepEqual(checkpoint.unreadPaths, [new UnreadPath("closed", UnreadReason.Denied, null), new UnreadPath("z.log", UnreadReason.Changing, null)]);
    });
  });

  it("gives a folder with no files a checkpoint with nothing under files/, and a capture with nothing changed a new one", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const empty = await harness.checkpointAsync("empty");
    await harness.writeAsync("a.txt", "alpha");
    const first = await harness.checkpointAsync("one");
    const second = await harness.checkpointAsync("two");

    assert.deepEqual([...(await harness.treeAsync(empty)).keys()], ["checkpoint.json"]);
    assert.notEqual(second.id, first.id);
    assert.equal(second.label, "two");
    assert.equal((await harness.treeAsync(second)).get("files/a.txt")?.objectId, (await harness.treeAsync(first)).get("files/a.txt")?.objectId);
  });

  it("leaves no checkpoint and no new index when fast-import fails", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "alpha");
    await harness.checkpointAsync(null);
    const index = await readFile(path.join(harness.store, "index"), "utf8");
    await writeFile(path.join(harness.store, "index"), index.replace(/"objectId":"[0-9a-f]+"/, `"objectId":"${"1".repeat(40)}"`)
      .replace(/"start":"\d+"/, `"start":"${CheckpointsHarness.vouchingStartOf(JsonFixture.parse(index))}"`));
    const broken = await readFile(path.join(harness.store, "index"), "utf8");

    await assert.rejects(harness.captureAsync(null), (error: unknown) => error instanceof GitExitedException && error.command === "fast-import");
    assert.equal((await harness.listAsync()).length, 1);
    assert.equal(await readFile(path.join(harness.store, "index"), "utf8"), broken);
  });

  it("takes no checkpoint where the store's volume lacks 2 GiB free beyond the new and changed files, and answers the space free and needed", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const margin = 2 * 1024 * 1024 * 1024;
    let free = margin + 8;
    const read: string[] = [];
    const service = await harness.createServiceAsync(ServiceSeams.system.withReadFree(async location => {
      read.push(location);
      return free;
    }));
    const captureAsync = async (): Promise<CaptureResult> => await service.captureAsync(new CaptureRequest(harness.reference, null));
    await harness.writeAsync("a.txt", "alpha");
    await harness.writeAsync("b.txt", "beta");

    const short = await captureAsync();
    free = margin + 9;
    const taken = await captureAsync();
    const index = await harness.readStoreFileAsync("index");
    await writeFile(path.join(harness.store, "index"), JSON.stringify({ ...index, start: CheckpointsHarness.vouchingStartOf(index) }));
    await harness.writeAsync("b.txt", "beta!");
    free = margin + 4;
    const changedShort = await captureAsync();
    free = margin + 5;
    const changedTaken = await captureAsync();

    assert.deepEqual([short.outcome, short.checkpoint, short.spaceFree, short.spaceNeeded], [CaptureOutcome.LowDiskSpace, null, margin + 8, margin + 9]);
    assert.deepEqual([changedShort.outcome, changedShort.spaceFree, changedShort.spaceNeeded], [CaptureOutcome.LowDiskSpace, margin + 4, margin + 5]);
    assert.deepEqual([taken.outcome, changedTaken.outcome, taken.spaceFree, taken.spaceNeeded], [CaptureOutcome.Captured, CaptureOutcome.Captured, null, null]);
    assert.deepEqual((await harness.listAsync()).map(u => u.id), [changedTaken.checkpoint?.id, taken.checkpoint?.id]);
    assert.deepEqual(new Set(read), new Set([harness.store]));
  });

  it("stops a capture whose store's volume falls below the margin while its content streams, and leaves the store as it was", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const margin = 2 * 1024 * 1024 * 1024;
    const part = 10 * 1024 * 1024;
    const large = 7 * part;
    let reads = 0;
    const service = await harness.createServiceAsync(ServiceSeams.system.withReadFree(async () => ++reads === 3 ? margin : margin + large + 1024));
    await harness.writeAsync("a.txt", "alpha");
    const first = await service.captureAsync(new CaptureRequest(harness.reference, null));
    const index = await harness.readStoreFileAsync("index");
    await writeFile(path.join(harness.store, "index"), JSON.stringify({ ...index, start: CheckpointsHarness.vouchingStartOf(index) }));
    const settledAsync = async (): Promise<readonly (readonly [string, string | null])[]> =>
      (await harness.snapshotAsync(harness.store)).filter(([u]) => !u.startsWith("git/objects/pack/tmp_pack_"));
    const store = await settledAsync();
    await harness.writeAsync("b.txt", "beta");
    for (let count = 0; count < 7; count++)
      await harness.writeAsync(`large-${count}.bin`, Buffer.alloc(part, count));

    const result = await service.captureAsync(new CaptureRequest(harness.reference, null));

    assert.deepEqual([result.outcome, result.checkpoint, result.spaceFree, result.spaceNeeded], [CaptureOutcome.LowDiskSpace, null, margin, margin + large + 4]);
    assert.equal(reads, 3);
    assert.deepEqual((await harness.listAsync()).map(u => u.id), [first.checkpoint?.id]);
    assert.deepEqual(await settledAsync(), store);
  });

  it("takes a capture whose 64 MiB step falls on its final write, checking no space there, since fast-import completes there, and keeps its objects", async t => {
    const margin = 2 * 1024 * 1024 * 1024;
    const interval = 64 * 1024 * 1024;
    const unmetered = ["feature done\n", "\ncheckpoint\nget-mark :1\n"];
    const countSent = (harness: CheckpointsHarness): (() => number) => {
      let sent = 0;
      harness.context.watchInput = (command, chunk) => {
        if (command === "fast-import" && !unmetered.includes(chunk))
          sent += chunk.length;
      };
      return () => sent;
    };
    const part = 10 * 1024 * 1024;
    const writePartsAsync = async (harness: CheckpointsHarness, last: number): Promise<void> => {
      for (let count = 0; count < 6; count++)
        await harness.writeAsync(`part-${count}.bin`, Buffer.alloc(part, count));
      await harness.writeAsync("part-6.bin", Buffer.alloc(last, 6));
    };
    const probe = await CheckpointsHarness.startAsync(t);
    const probeSent = countSent(probe);
    const probeService = await probe.createServiceAsync(ServiceSeams.system.withReadFree(async () => margin + interval * 2));
    const probeLast = interval - 4096 - 6 * part;
    await writePartsAsync(probe, probeLast);
    assert.equal((await probeService.captureAsync(new CaptureRequest(probe.reference, null))).outcome, CaptureOutcome.Captured);
    const last = probeLast + interval - probeSent();
    const harness = await CheckpointsHarness.startAsync(t);
    const sent = countSent(harness);
    let reads = 0;
    const service = await harness.createServiceAsync(ServiceSeams.system.withReadFree(async () => ++reads === 1 ? margin + interval * 2 : margin - 1));
    await writePartsAsync(harness, last);

    const result = await service.captureAsync(new CaptureRequest(harness.reference, null));

    assert.equal(sent(), interval);
    assert.deepEqual([result.outcome, reads], [CaptureOutcome.Captured, 1]);
    assert.ok(result.checkpoint !== null);
    const object = (await harness.treeAsync(result.checkpoint)).get("files/part-6.bin")?.objectId ?? "";
    assert.equal((await harness.gitAsync(["cat-file", "-s", object])).toString("utf8").trim(), String(last));
  });

  it("follows the ignore files while the setting is on: keeps what they don't ignore, each .gitignore under rules/, and how it matched", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    harness.context.settings.write("checkpoints.followIgnoreFiles", true);
    await harness.writeAsync(".gitignore", "*.log\n");
    await harness.writeAsync("a.txt", "alpha");
    await harness.writeAsync("a.log", "log");
    await harness.writeAsync("vendor/lib/.git/HEAD", "ref: refs/heads/main\n");
    await harness.writeAsync("vendor/lib/.gitignore", "*.tmp\n");
    await harness.writeAsync("vendor/lib/b.log", "kept");
    await harness.writeAsync("vendor/lib/b.tmp", "left out");

    const checkpoint = await harness.checkpointAsync(null);

    const tree = await harness.treeAsync(checkpoint);
    assert.deepEqual([...tree.keys()].sort(), [
      "checkpoint.json", "files/.gitignore", "files/a.txt", "files/vendor/lib/.gitignore", "files/vendor/lib/b.log", "rules/.gitignore",
      "rules/vendor/lib/.gitignore"
    ]);
    assert.equal(tree.get("rules/.gitignore")?.objectId, tree.get("files/.gitignore")?.objectId);
    assert.equal((await harness.contentAsync(checkpoint, "rules/vendor/lib/.gitignore")).toString(), "*.tmp\n");
    assert.equal(checkpoint.mode, CaptureMode.IgnoreFiles);
    assert.deepEqual(JSON.parse((await harness.contentAsync(checkpoint, "checkpoint.json")).toString())["ignoreRules"], {
      ignoresCase: await CaseFixture.ignoresCaseAsync(), repositoryFolders: ["vendor/lib"]
    });
  });

  it("keeps under rules/ a .gitignore that ignores itself, which files/ doesn't hold", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    harness.context.settings.write("checkpoints.followIgnoreFiles", true);
    await harness.writeAsync(".gitignore", ".gitignore\n");
    await harness.writeAsync("a.txt", "alpha");

    const checkpoint = await harness.checkpointAsync(null);

    assert.deepEqual([...(await harness.treeAsync(checkpoint)).keys()].sort(), ["checkpoint.json", "files/a.txt", "rules/.gitignore"]);
    assert.equal((await harness.contentAsync(checkpoint, "rules/.gitignore")).toString(), ".gitignore\n");
  });

  it("leaves out a file over 10 MiB as too large, keeps one of exactly 10 MiB, and its restore preview keeps the one left out", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const limit = 10 * 1024 * 1024;
    truncateSync(await harness.writeAsync("big.bin", ""), limit + 1);
    truncateSync(await harness.writeAsync("edge.bin", ""), limit);
    await harness.writeAsync("a.txt", "alpha");

    const checkpoint = await harness.checkpointAsync(null);
    const index = await harness.readStoreFileAsync("index");
    const plan = await harness.planAsync(checkpoint);

    assert.deepEqual(checkpoint.unreadPaths, [new UnreadPath("big.bin", UnreadReason.TooLarge, null)]);
    assert.deepEqual([...(await harness.treeAsync(checkpoint)).keys()].sort(), ["checkpoint.json", "files/a.txt", "files/edge.bin"]);
    assert.deepEqual(JsonFixture.objectsOf(index["entries"]).map(u => u["path"]), ["a.txt", "edge.bin"]);
    assert.deepEqual(plan.stays, [new KeptPath("big.bin", KeepReason.TooLarge)]);
    assert.deepEqual(plan.steps, []);
  });

  it("takes no checkpoint when the content it would add is over 1 GiB, and gives that size and the limit", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const size = 10 * 1024 * 1024;
    for (let count = 0; count < 103; count++)
      truncateSync(await harness.writeAsync(`part-${String(count).padStart(3, "0")}.bin`, ""), size);

    const result = await harness.captureAsync(null);

    assert.deepEqual([result.outcome, result.checkpoint, result.spaceFree, result.spaceNeeded, result.contentSize, result.contentLimit],
      [CaptureOutcome.TooLarge, null, null, null, 103 * size, 1024 * 1024 * 1024]);
    assert.deepEqual(await harness.listAsync(), []);
  });

  it("keeps the earlier copy of a file changed at or after the turn's start, leaves out a file new since then, and its restore preview names the earlier copies", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "alpha");
    await harness.writeAsync("b.txt", "beta");
    await harness.checkpointAsync(null);
    const asOf = new Date(Date.now() + 60_000);
    await utimes(await harness.writeAsync("a.txt", "alpha!"), asOf, asOf);
    await utimes(await harness.writeAsync("c.txt", "gamma"), asOf, asOf);
    await harness.writeAsync("b.txt", "beta!");

    const result = await harness.captureAsync(null, asOf);
    assert.ok(result.checkpoint !== null);
    const earlier = await earlierPathsAsync(harness, result.checkpoint);
    const plan = await harness.planAsync(result.checkpoint);

    assert.deepEqual([...(await harness.treeAsync(result.checkpoint)).keys()].sort(), ["checkpoint.json", "files/a.txt", "files/b.txt"]);
    assert.equal((await harness.contentAsync(result.checkpoint, "files/a.txt")).toString(), "alpha");
    assert.equal((await harness.contentAsync(result.checkpoint, "files/b.txt")).toString(), "beta!");
    assert.deepEqual(result.checkpoint.unreadPaths, []);
    assert.deepEqual(earlier, ["a.txt"]);
    assert.deepEqual(plan.steps.map(u => u.path).sort(), ["a.txt", "c.txt"]);
    assert.deepEqual(plan.earlierPaths, ["a.txt"]);
  });

  it("counts a file changed within two seconds before the turn's start as the turn's, since a filesystem may keep times to two seconds, and reads one changed earlier", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("near.txt", "near");
    await harness.writeAsync("far.txt", "far");
    await harness.checkpointAsync(null);
    const asOf = new Date(Date.now() + 60_000);
    const near = new Date(asOf.getTime() - 1_500);
    const far = new Date(asOf.getTime() - 2_500);
    await utimes(await harness.writeAsync("near.txt", "near!"), near, near);
    await utimes(await harness.writeAsync("far.txt", "far!"), far, far);

    const result = await harness.captureAsync(null, asOf);
    assert.ok(result.checkpoint !== null);

    assert.equal((await harness.contentAsync(result.checkpoint, "files/near.txt")).toString(), "near");
    assert.equal((await harness.contentAsync(result.checkpoint, "files/far.txt")).toString(), "far!");
  });

  it("keeps the earlier copy of each file changed since the last turn when the clock stepped back between turns", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "alpha");
    await harness.checkpointAsync(null);
    await harness.writeAsync("a.txt", "alpha!");
    await harness.writeAsync("b.txt", "beta");

    const result = await harness.captureAsync(null, new Date(Date.now() - 3_600_000));
    assert.ok(result.checkpoint !== null);

    assert.deepEqual([...(await harness.treeAsync(result.checkpoint)).keys()].sort(), ["checkpoint.json", "files/a.txt"]);
    assert.equal((await harness.contentAsync(result.checkpoint, "files/a.txt")).toString(), "alpha");
  });

  it("keeps the earlier copy of a file the turn deletes while the capture reads, and leaves out a new one it deletes", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "alpha");
    await harness.writeAsync("b.txt", "beta");
    await harness.checkpointAsync(null);
    await harness.writeAsync("a.txt", "alpha!");
    await harness.writeAsync("b.txt", "beta!");
    await harness.writeAsync("n.txt", "new");
    watchContents(harness, count => {
      if (count === 1) {
        unlinkSync(path.join(harness.folder, "b.txt"));
        unlinkSync(path.join(harness.folder, "n.txt"));
      }
    });

    const result = await harness.captureAsync(null, new Date(Date.now() + 60_000));
    assert.ok(result.checkpoint !== null);
    const earlier = await earlierPathsAsync(harness, result.checkpoint);

    assert.deepEqual([...(await harness.treeAsync(result.checkpoint)).keys()].sort(), ["checkpoint.json", "files/a.txt", "files/b.txt"]);
    assert.equal((await harness.contentAsync(result.checkpoint, "files/a.txt")).toString(), "alpha!");
    assert.equal((await harness.contentAsync(result.checkpoint, "files/b.txt")).toString(), "beta");
    assert.deepEqual(result.checkpoint.unreadPaths, []);
    assert.deepEqual(earlier, ["b.txt"]);
  });

  it("keeps the earlier copy of a file deleted from a folder changed at or after the turn's start, a whole deleted folder's too, and none from an older folder", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("keep/a.txt", "alpha");
    await harness.writeAsync("keep/stays.txt", "stays");
    await harness.writeAsync("old/b.txt", "beta");
    await harness.writeAsync("old/stays.txt", "stays");
    await harness.writeAsync("gone/c.txt", "gamma");
    await harness.writeAsync("gone/deep/d.txt", "delta");
    await harness.checkpointAsync(null);
    const asOf = new Date(Date.now() + 60_000);
    const before = new Date(asOf.getTime() - 3_600_000);
    await rm(path.join(harness.folder, "keep", "a.txt"));
    await rm(path.join(harness.folder, "old", "b.txt"));
    await rm(path.join(harness.folder, "gone"), { recursive: true });
    await utimes(path.join(harness.folder, "keep"), asOf, asOf);
    await utimes(path.join(harness.folder, "old"), before, before);
    await utimes(harness.folder, asOf, asOf);

    const result = await harness.captureAsync(null, asOf);
    assert.ok(result.checkpoint !== null);
    const earlier = await earlierPathsAsync(harness, result.checkpoint);

    assert.deepEqual([...(await harness.treeAsync(result.checkpoint)).keys()].sort(),
      ["checkpoint.json", "files/gone/c.txt", "files/gone/deep/d.txt", "files/keep/a.txt", "files/keep/stays.txt", "files/old/stays.txt"]);
    assert.deepEqual([...earlier].sort(), ["gone/c.txt", "gone/deep/d.txt", "keep/a.txt"]);
  });

  it("brings back no earlier copy of a file under a folder the walk can't read", { skip: AccessFixture.isRoot ? "root reads past any file mode" : false }, async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("closed/x.txt", "x");
    await harness.writeAsync("a.txt", "alpha");
    await harness.checkpointAsync(null);
    const asOf = new Date(Date.now() + 60_000);
    await utimes(harness.folder, asOf, asOf);

    await AccessFixture.whileDeniedAsync(path.join(harness.folder, "closed"), async () => {
      const result = await harness.captureAsync(null, asOf);
      assert.ok(result.checkpoint !== null);

      assert.deepEqual([...(await harness.treeAsync(result.checkpoint)).keys()].sort(), ["checkpoint.json", "files/a.txt"]);
      assert.deepEqual(result.checkpoint.unreadPaths, [new UnreadPath("closed", UnreadReason.Denied, null)]);
      assert.deepEqual(await earlierPathsAsync(harness, result.checkpoint), []);
    });
  });

  it("brings back no earlier copy of a path the ignore files now ignore, a file or one under an ignored folder", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.log", "log");
    await harness.writeAsync("vendor/x.ts", "x");
    await harness.writeAsync("a.txt", "alpha");
    await harness.checkpointAsync(null);
    harness.context.settings.write("checkpoints.followIgnoreFiles", true);
    await harness.writeAsync(".gitignore", "*.log\nvendor/\n");
    const asOf = new Date(Date.now() + 60_000);
    await utimes(harness.folder, asOf, asOf);

    const result = await harness.captureAsync(null, asOf);
    assert.ok(result.checkpoint !== null);
    const earlier = await earlierPathsAsync(harness, result.checkpoint);

    assert.deepEqual([...(await harness.treeAsync(result.checkpoint)).keys()].sort(), ["checkpoint.json", "files/.gitignore", "files/a.txt", "rules/.gitignore"]);
    assert.deepEqual(earlier, []);
  });
});
