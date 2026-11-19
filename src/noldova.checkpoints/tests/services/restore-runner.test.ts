/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { appendFileSync, truncateSync, writeFileSync } from "node:fs";
import { chmod, lstat, mkdir, readdir, readFile, rename, rm, symlink, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import {
  CaptureOutcome,
  KeepReason,
  KeptPath,
  PreviewOutcome,
  RestoreOutcome,
  RestorePlan,
  UnreadPath,
  UnreadReason
} from "@noldova/checkpoints.protocol";

import { JournalRecordType } from "../../src/models/journal-record-type.ts";
import type { JournalRecord } from "../../src/models/journal-record.ts";
import { AccessFixture } from "../fixtures/access.fixture.ts";
import { AttemptedRestore } from "../fixtures/attempted-restore.fixture.ts";
import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";
import { LinkFixture } from "../fixtures/link.fixture.ts";
import { PreparedRestore } from "../fixtures/prepared-restore.fixture.ts";
import { RestoreFolder } from "../fixtures/restore-folder.fixture.ts";
import type { ScriptView } from "../fixtures/script-view.fixture.ts";
import { ScriptedJournal } from "../fixtures/scripted-journal.fixture.ts";
import { ServiceSeams } from "../fixtures/service-seams.fixture.ts";
import { StopPoint } from "../fixtures/stop-point.fixture.ts";
import { StoppedRestore } from "../fixtures/stopped-restore.fixture.ts";

const linkType = process.platform === "win32" ? "junction" : "dir";
const withoutLinks = await LinkFixture.withoutLinksAsync();
const scriptAsync = async (harness: CheckpointsHarness): Promise<ScriptView> => await RestoreFolder.of(harness).scriptAsync();
const locationOf = (harness: CheckpointsHarness, relativePath: string): string => RestoreFolder.of(harness).locationOf(relativePath);
const asideOfAsync = async (harness: CheckpointsHarness, relativePath: string): Promise<string> => await RestoreFolder.of(harness).asideOfAsync(relativePath);
const stageOfAsync = async (harness: CheckpointsHarness, step: number): Promise<string> => await RestoreFolder.of(harness).stageOfAsync(step);
const stagingOfAsync = async (harness: CheckpointsHarness): Promise<string> => await RestoreFolder.of(harness).stagingAsync();
const holdInStagingAsync = async (harness: CheckpointsHarness): Promise<string> => {
  const held = path.join(harness.folder, await stagingOfAsync(harness), "held");
  await mkdir(held);
  await writeFile(path.join(held, "x.txt"), "held by another program");
  await AccessFixture.denyRemovingAsync(held);
  return held;
};
const releaseAsync = async (held: string): Promise<void> => {
  if (held !== "" && await RestoreFolder.existsAsync(held))
    await AccessFixture.allowRemovingAsync(held);
};
const sorted = (entries: readonly (readonly [string, string | null])[]): readonly (readonly [string, string | null])[] =>
  [...entries].sort(([t], [u]) => Buffer.compare(Buffer.from(t), Buffer.from(u)));
const base64 = (text: string): string => Buffer.from(text).toString("base64");

const rewritingInPlace = (harness: CheckpointsHarness, relativePath: string, text: string, time: number): (record: JournalRecord) => Promise<void> =>
  RestoreFolder.of(harness).rewritingInPlace(relativePath, text, time);
const time = RestoreFolder.time;

describe("RestoreRunner", { concurrency: true }, () => {
  it("restores each path the plan writes, replaces and deletes, through each change of kind, staging with cat-file --batch --buffer, and the checkpoint taken before it undoes it", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const { checkpoint, saved } = await PreparedRestore.prepareAsync(harness);
    const now = await harness.snapshotAsync();
    const plan = await harness.planAsync(checkpoint);
    const start = harness.context.requests.length;

    const result = await harness.restoreAsync(plan);

    assert.equal(result.outcome, RestoreOutcome.Restored);
    assert.equal(result.before?.label, "Before restore");
    assert.equal(result.recovered, null);
    assert.deepEqual(await harness.snapshotAsync(), saved);
    await RestoreFolder.of(harness).assertCleanAsync();
    assert.deepEqual(harness.context.events.get("checkpoints.restored"), [{ identity: CheckpointsHarness.identity, checkpoint: checkpoint.id, before: result.before?.id }]);
    const batches = harness.context.requests.slice(start).filter(u => u.arguments[1] === "--batch").map(u => u.arguments.join(" "));
    assert.deepEqual([...new Set(batches)], ["cat-file --batch --buffer"]);

    const undone = await harness.restoreAsync(await harness.planAsync(RestoreFolder.presentOf(result.before)));

    assert.equal(undone.outcome, RestoreOutcome.Restored);
    assert.deepEqual(await harness.snapshotAsync(), now);
  });

  it("restores on a volume without hard links by copies, and rolls back by the copies' file ids", async t => {
    const restored = await CheckpointsHarness.startAsync(t);
    const { checkpoint: first, saved } = await PreparedRestore.prepareAsync(restored);

    const result = await restored.restoreAsync(await restored.planAsync(first), await restored.createServiceAsync(ServiceSeams.system.withoutHardLinks()));

    assert.equal(result.outcome, RestoreOutcome.Restored);
    assert.deepEqual(await restored.snapshotAsync(), saved);
    await RestoreFolder.of(restored).assertCleanAsync();

    const harness = await CheckpointsHarness.startAsync(t);
    const { checkpoint } = await PreparedRestore.prepareAsync(harness);
    const plan = await harness.planAsync(checkpoint);
    const now = await harness.snapshotAsync();
    let journal: ScriptedJournal | undefined;
    const service = await harness.createServiceAsync(ServiceSeams.system.withJournals(file => journal = new ScriptedJournal(file, async record => {
      if (record.type === JournalRecordType.Placed && journal?.appended.filter(u => u.type === JournalRecordType.Placed).length === 1)
        await rm(await stageOfAsync(harness, RestoreFolder.presentOf(record.step)));
    })).withoutHardLinks());

    assert.equal((await harness.restoreAsync(plan, service)).outcome, RestoreOutcome.RolledBack);
    assert.deepEqual(await harness.snapshotAsync(), now);
    await RestoreFolder.of(harness).assertCleanAsync();
  });

  it("restores a large file a checkpoint kept before the size limit, and a file's letter case where the folder ignores case", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const large = Buffer.alloc(40 * 1024 * 1024, 7);
    await harness.writeAsync("large.bin", "large");
    await harness.writeAsync("Docs/Readme.md", "readme");
    const checkpoint = await harness.checkpointAsync(null);
    await harness.replaceFileAsync(checkpoint, "large.bin", large);
    await harness.writeAsync("large.bin", "small now");
    await rename(path.join(harness.folder, "Docs", "Readme.md"), path.join(harness.folder, "Docs", "README.md"));
    await rename(path.join(harness.folder, "Docs"), path.join(harness.folder, "docs"));

    const result = await harness.restoreAsync(await harness.planAsync(checkpoint));

    assert.equal(result.outcome, RestoreOutcome.Restored);
    assert.deepEqual(await readFile(path.join(harness.folder, "large.bin")), large);
    assert.deepEqual((await readdir(harness.folder)).sort(), ["Docs", "large.bin"]);
    assert.deepEqual(await readdir(path.join(harness.folder, "Docs")), ["Readme.md"]);
    await RestoreFolder.of(harness).assertCleanAsync();
  });

  it("keeps a file that grew past 10 MiB since the checkpoint as too large, and restores the rest", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const limit = 10 * 1024 * 1024;
    const grown = await harness.writeAsync("grown.bin", "small");
    await harness.writeAsync("a.txt", "alpha");
    const checkpoint = await harness.checkpointAsync(null);
    truncateSync(grown, limit + 1);
    await harness.writeAsync("a.txt", "alpha!");

    const plan = await harness.planAsync(checkpoint);
    const result = await harness.restoreAsync(plan);

    assert.deepEqual(plan.stays, [new KeptPath("grown.bin", KeepReason.TooLarge)]);
    assert.deepEqual(plan.steps.map(u => u.path), ["a.txt"]);
    assert.equal(result.outcome, RestoreOutcome.Restored);
    assert.equal(await readFile(path.join(harness.folder, "a.txt"), "utf8"), "alpha");
    assert.equal((await lstat(grown)).size, limit + 1);
  });

  it("restores a file that is a link", { skip: withoutLinks }, async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("target.txt", "target");
    await LinkFixture.symlinkAsync("target.txt", path.join(harness.folder, "link"), "file");
    const checkpoint = await harness.checkpointAsync(null);
    await rm(path.join(harness.folder, "link"));
    await harness.writeAsync("link", "a file now");

    const result = await harness.restoreAsync(await harness.planAsync(checkpoint));

    assert.equal(result.outcome, RestoreOutcome.Restored);
    assert.deepEqual(await harness.snapshotAsync(), [["link", "link:target.txt"], ["target.txt", Buffer.from("target").toString("base64")]]);
  });

  it("keeps a link as one it can't create, and restores the rest, when this process can't create links", { skip: withoutLinks === false ? LinkFixture.withLinks : false }, async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await mkdir(path.join(harness.folder, "target"));
    await symlink(path.join(harness.folder, "target"), path.join(harness.folder, "link"), linkType);
    await harness.writeAsync("a.txt", "alpha");
    const checkpoint = await harness.checkpointAsync(null);
    await rm(path.join(harness.folder, "link"));
    await harness.writeAsync("link", "a file now");
    await harness.writeAsync("a.txt", "alpha!");

    const plan = await harness.planAsync(checkpoint);
    const result = await harness.restoreAsync(plan);

    assert.deepEqual(plan.stays, [new KeptPath("link", KeepReason.LinkUnsupported)]);
    assert.deepEqual(plan.steps.map(u => u.path), ["a.txt"]);
    assert.equal(result.outcome, RestoreOutcome.Restored);
    assert.deepEqual([await readFile(path.join(harness.folder, "a.txt"), "utf8"), await readFile(path.join(harness.folder, "link"), "utf8")], ["alpha", "a file now"]);
    await RestoreFolder.of(harness).assertCleanAsync();
  });

  it("rolls back a link it placed by a new link, by the new link's file id", { skip: withoutLinks }, async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("target.txt", "target");
    await LinkFixture.symlinkAsync("target.txt", path.join(harness.folder, "link"), "file");
    await harness.writeAsync("z.txt", "z");
    const checkpoint = await harness.checkpointAsync(null);
    await rm(path.join(harness.folder, "link"));
    await harness.writeAsync("link", "a file now");
    await harness.writeAsync("z.txt", "z, changed");
    const plan = await harness.planAsync(checkpoint);
    const now = await harness.snapshotAsync();
    let journal: ScriptedJournal | undefined;
    const service = await harness.createServiceAsync(ServiceSeams.system.withJournals(file => journal = new ScriptedJournal(file, async record => {
      if (record.type === JournalRecordType.Placed)
        await rm(locationOf(harness, RestoreFolder.presentOf((await scriptAsync(harness)).steps.find(u => u.path === "z.txt")?.stage ?? null)));
    })));

    const result = await harness.restoreAsync(plan, service);

    assert.equal(result.outcome, RestoreOutcome.RolledBack);
    assert.deepEqual(journal?.appended.filter(u => u.type === JournalRecordType.Placed).length, 1);
    assert.deepEqual(await harness.snapshotAsync(), now);
    await RestoreFolder.of(harness).assertCleanAsync();
  });

  it("keeps a nested repository's .git and its folders while it restores the files inside them", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("vendor/lib/file.txt", "file");
    const checkpoint = await harness.checkpointAsync(null);
    await harness.writeAsync("vendor/lib/file.txt", "file, changed");
    await harness.writeAsync("vendor/lib/.git/HEAD", "ref: refs/heads/main\n");
    await harness.writeAsync("vendor/lib/.git/config", "[core]\n");
    const repository = await harness.snapshotAsync(path.join(harness.folder, "vendor", "lib", ".git"));

    const result = await harness.restoreAsync(await harness.planAsync(checkpoint));

    assert.equal(result.outcome, RestoreOutcome.Restored);
    assert.equal(await readFile(path.join(harness.folder, "vendor", "lib", "file.txt"), "utf8"), "file");
    assert.deepEqual(await harness.snapshotAsync(path.join(harness.folder, "vendor", "lib", ".git")), repository);
  });

  it("leaves the person's repository as it was, byte for byte, through checkpoints, comparisons and restores, and never runs its hooks", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const marker = path.join(harness.root, "hooked").split(path.sep).join("/");
    const hook = `#!/bin/sh\necho ran >> "${marker}"\n`;
    await harness.writeAsync(".git/HEAD", "ref: refs/heads/main\n");
    await harness.writeAsync(".git/config", "[core]\n\trepositoryformatversion = 0\n\tbare = false\n[user]\n\tname = Someone\n");
    await harness.writeAsync(".git/refs/heads/main", `${"e".repeat(40)}\n`);
    await harness.writeAsync(".git/index", Buffer.from([0x44, 0x49, 0x52, 0x43, 0, 0, 0, 2, 0, 0, 0, 0]));
    for (const name of ["pre-commit", "post-commit", "post-checkout", "reference-transaction", "post-index-change"])
      await chmod(await harness.writeAsync(`.git/hooks/${name}`, hook), 0o755);
    await harness.writeAsync("a.txt", "a");
    const repository = path.join(harness.folder, ".git");
    const timesAsync = async (): Promise<readonly string[]> =>
      await Promise.all((await harness.snapshotAsync(repository)).map(async ([u]) => `${u} ${(await lstat(path.join(repository, ...u.split("/")), { bigint: true })).mtimeNs}`));
    const [contentBefore, timesBefore] = [await harness.snapshotAsync(repository), await timesAsync()];

    const checkpoint = await harness.checkpointAsync(null);
    await harness.writeAsync("a.txt", "a, changed");
    await harness.compareAsync(checkpoint, null);
    const restored = await harness.restoreAsync(await harness.planAsync(checkpoint));
    await harness.restoreAsync(await harness.planAsync(RestoreFolder.presentOf(restored.before)));
    await harness.checkpointAsync(null);

    assert.equal(restored.outcome, RestoreOutcome.Restored);
    assert.deepEqual(await harness.snapshotAsync(repository), contentBefore);
    assert.deepEqual(await timesAsync(), timesBefore);
    assert.equal(await RestoreFolder.existsAsync(path.join(harness.root, "hooked")), false);
  });

  it("keeps a folder that holds a .git at any depth, and each folder above it, through a change of kind, a case-only rename and a deletion", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("tool", "t");
    await harness.writeAsync("Repo/a.txt", "a");
    const checkpoint = await harness.checkpointAsync(null);
    await rm(path.join(harness.folder, "tool"));
    await harness.writeAsync("tool/.git/HEAD", "ref: refs/heads/main\n");
    await harness.writeAsync("tool/y.ts", "y");
    await harness.writeAsync("vendor/lib/.git/HEAD", "ref: refs/heads/main\n");
    await harness.writeAsync("vendor/lib/x.ts", "x");
    await rename(path.join(harness.folder, "Repo"), path.join(harness.folder, "repo"));
    await harness.writeAsync("repo/.git/HEAD", "ref: refs/heads/main\n");
    await harness.writeAsync("repo/a.txt", "a, changed");
    const ignoresCase = await RestoreFolder.existsAsync(path.join(harness.folder, "REPO"));
    const head = Buffer.from("ref: refs/heads/main\n").toString("base64");

    const result = await harness.restoreAsync(await harness.planAsync(checkpoint));

    assert.equal(result.outcome, RestoreOutcome.Restored);
    const expected: (readonly [string, string | null])[] = [
      ["tool", null], ["tool/.git", null], ["tool/.git/HEAD", head], ["vendor", null], ["vendor/lib", null], ["vendor/lib/.git", null],
      ["vendor/lib/.git/HEAD", head], ["repo", null], ["repo/.git", null], ["repo/.git/HEAD", head]
    ];
    expected.push(...ignoresCase ? [["repo/a.txt", Buffer.from("a").toString("base64")] as const] : [["Repo", null] as const, ["Repo/a.txt", Buffer.from("a").toString("base64")] as const]);
    assert.deepEqual(await harness.snapshotAsync(), expected.sort(([u], [v]) => Buffer.compare(Buffer.from(u), Buffer.from(v))));
  });

  it("refuses a plan the folder has moved on from, and changes nothing", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const { checkpoint } = await PreparedRestore.prepareAsync(harness);
    const plan = await harness.planAsync(checkpoint);
    await harness.writeAsync("a.txt", "a, changed again");
    const now = await harness.snapshotAsync();

    const result = await harness.restoreAsync(plan);

    assert.equal(result.outcome, RestoreOutcome.MovedOn);
    assert.equal(result.before, null);
    assert.deepEqual(await harness.snapshotAsync(), now);
    assert.equal((await harness.listAsync()).length, 1);
  });

  it("ends the restore when a repository appears in a planned folder after the preview", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("vendor/lib", "a file");
    const checkpoint = await harness.checkpointAsync(null);
    await rm(path.join(harness.folder, "vendor", "lib"));
    await harness.writeAsync("vendor/lib/x.txt", "x");
    const plan = await harness.planAsync(checkpoint);
    await harness.writeAsync("vendor/lib/.git/HEAD", "ref: refs/heads/main\n");
    const now = await harness.snapshotAsync();

    const result = await harness.restoreAsync(plan);

    assert.equal(result.outcome, RestoreOutcome.MovedOn);
    assert.deepEqual(await harness.snapshotAsync(), now);
  });

  it("ends the restore when a folder on a planned path becomes a link after the preview", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("dir/c.txt", "c");
    const checkpoint = await harness.checkpointAsync(null);
    await harness.writeAsync("dir/c.txt", "c, changed");
    const plan = await harness.planAsync(checkpoint);
    await rename(path.join(harness.folder, "dir"), path.join(harness.root, "elsewhere"));
    await symlink(path.join(harness.root, "elsewhere"), path.join(harness.folder, "dir"), linkType);

    const result = await harness.restoreAsync(plan);

    assert.equal(result.outcome, RestoreOutcome.MovedOn);
    assert.equal(await readFile(path.join(harness.root, "elsewhere", "c.txt"), "utf8"), "c, changed");
  });

  it("refuses a restore without the free space it needs, or whose checkpoint taken before it runs out of space, and changes nothing", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const { checkpoint } = await PreparedRestore.prepareAsync(harness);
    const now = await harness.snapshotAsync();
    const listed = await harness.listAsync();
    const service = await harness.createServiceAsync(ServiceSeams.system.withHasRoom(async () => false));
    const capturing = await harness.createServiceAsync(ServiceSeams.system.withHasRoom(async () => true).withReadFree(async () => 0));

    const result = await harness.restoreAsync(await harness.planAsync(checkpoint), service);
    const captureShort = await harness.restoreAsync(await harness.planAsync(checkpoint), capturing);

    assert.deepEqual([result.outcome, captureShort.outcome], [RestoreOutcome.LowDiskSpace, RestoreOutcome.LowDiskSpace]);
    assert.deepEqual(await harness.snapshotAsync(), now);
    assert.deepEqual(await harness.listAsync(), listed);
  });

  it("rolls back, keeping the file, when another program writes a planned file after the checkpoint taken before the restore", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const { checkpoint } = await PreparedRestore.prepareAsync(harness);
    const plan = await harness.planAsync(checkpoint);
    let captured = false;
    harness.context.watchInput = command => {
      if (command === "fast-import")
        captured = true;
      else if (command === "cat-file" && captured) {
        captured = false;
        writeFileSync(path.join(harness.folder, "a.txt"), "written by another program");
      }
    };
    const now = await harness.snapshotAsync();

    const result = await harness.restoreAsync(plan);

    assert.equal(result.outcome, RestoreOutcome.RolledBack);
    assert.equal(result.before?.label, "Before restore");
    assert.equal(await readFile(path.join(harness.folder, "a.txt"), "utf8"), "written by another program");
    assert.deepEqual((await harness.snapshotAsync()).filter(([u]) => u !== "a.txt"), now.filter(([u]) => u !== "a.txt"));
    await RestoreFolder.of(harness).assertCleanAsync();
  });

  it("rolls back, keeping the file, when another program puts in place of a planned file one of its size, modified time and file id", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "a");
    const checkpoint = await harness.checkpointAsync(null);
    await harness.writeAsync("f.txt", "aaaa");
    await utimes(path.join(harness.folder, "f.txt"), time, time);
    const plan = await harness.planAsync(checkpoint);
    const swapAsync = rewritingInPlace(harness, "f.txt", "bbbb", time);
    const service = await harness.createServiceAsync(ServiceSeams.system.withJournals(file => new ScriptedJournal(file, swapAsync)));

    const result = await harness.restoreAsync(plan, service);

    assert.equal(result.outcome, RestoreOutcome.RolledBack);
    assert.equal(await readFile(path.join(harness.folder, "f.txt"), "utf8"), "bbbb");
    assert.equal(Buffer.from((await harness.readAsync(RestoreFolder.presentOf(result.before), "f.txt", null)).content).toString("utf8"), "aaaa");
    await RestoreFolder.of(harness).assertCleanAsync();
  });

  it("rolls back, keeping the file, when another program keeps the restore from reading a planned file once it is moved aside", { skip: AccessFixture.isRoot ? "root reads past any file mode" : false }, async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "a");
    const checkpoint = await harness.checkpointAsync(null);
    await harness.writeAsync("f.txt", "f");
    const file = path.join(harness.folder, "f.txt");
    const plan = await harness.planAsync(checkpoint);
    let denied = false;
    const service = await harness.createServiceAsync(ServiceSeams.system.withJournals(journal => new ScriptedJournal(journal, async record => {
      if (record.type === JournalRecordType.Aside && !denied) {
        denied = true;
        await AccessFixture.denyReadingAsync(file);
      }
    })));

    try {
      const result = await harness.restoreAsync(plan, service);

      assert.equal(result.outcome, RestoreOutcome.RolledBack);
    }
    finally {
      if (denied)
        await AccessFixture.allowReadingAsync(file);
    }
    assert.equal(await readFile(file, "utf8"), "f");
    await RestoreFolder.of(harness).assertCleanAsync();
  });

  it("rolls back, keeping the file, when the app stops once it has moved aside a planned file another program put in place, as the folder is next opened", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "a");
    const checkpoint = await harness.checkpointAsync(null);
    await harness.writeAsync("f.txt", "aaaa");
    await utimes(path.join(harness.folder, "f.txt"), time, time);
    const plan = await harness.planAsync(checkpoint);

    await StoppedRestore.stopAsync(harness, plan, StopPoint.before(2), "rewriteInPlace");
    const recorded = (await RestoreFolder.of(harness).recordsAsync()).map(u => u.type);
    await harness.listAsync();

    assert.deepEqual(recorded, [JournalRecordType.Applying, JournalRecordType.Aside]);
    assert.equal(await readFile(path.join(harness.folder, "f.txt"), "utf8"), "bbbb");
    await RestoreFolder.of(harness).assertCleanAsync();
  });

  it("keeps in a checkpoint what another program wrote to a file after the restore moved it aside", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const { checkpoint } = await PreparedRestore.prepareAsync(harness);
    const plan = await harness.planAsync(checkpoint);
    const service = await harness.createServiceAsync(ServiceSeams.system.withJournals(file => new ScriptedJournal(file, async record => {
      if (record.type === JournalRecordType.Cleaning)
        await writeFile(await asideOfAsync(harness, "a.txt"), "written after it was moved aside");
    })));

    const result = await harness.restoreAsync(plan, service);

    assert.equal(result.outcome, RestoreOutcome.Restored);
    assert.equal(result.recovered?.label, "Recovered after restore");
    assert.equal(await readFile(path.join(harness.folder, "a.txt"), "utf8"), "a");
    assert.equal(Buffer.from((await harness.readAsync(RestoreFolder.presentOf(result.recovered), "a.txt", null)).content).toString("utf8"), "written after it was moved aside");
    await RestoreFolder.of(harness).assertCleanAsync();
  });

  it("moves back a moved-aside folder in which a .git appeared", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const { checkpoint } = await PreparedRestore.prepareAsync(harness);
    const plan = await harness.planAsync(checkpoint);
    const now = await harness.snapshotAsync();
    const service = await harness.createServiceAsync(ServiceSeams.system.withJournals(file => new ScriptedJournal(file, async record => {
      if (record.type !== JournalRecordType.Cleaning)
        return;
      const aside = await asideOfAsync(harness, "g");
      await mkdir(path.join(aside, ".git"));
      await writeFile(path.join(aside, ".git", "HEAD"), "ref: refs/heads/main\n");
    })));

    const result = await harness.restoreAsync(plan, service);

    assert.equal(result.outcome, RestoreOutcome.RolledBack);
    assert.deepEqual(await harness.snapshotAsync(), sorted([...now, ["g/.git", null], ["g/.git/HEAD", base64("ref: refs/heads/main\n")]]));
    await RestoreFolder.of(harness).assertCleanAsync();
  });

  it("keeps in a checkpoint what another program wrote into a folder after the restore moved it aside", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const { checkpoint, saved } = await PreparedRestore.prepareAsync(harness);
    const plan = await harness.planAsync(checkpoint);
    const service = await harness.createServiceAsync(ServiceSeams.system.withJournals(file => new ScriptedJournal(file, async record => {
      if (record.type === JournalRecordType.Cleaning)
        await writeFile(path.join(await asideOfAsync(harness, "g"), "new.txt"), "written into the folder after it was moved aside");
    })));

    const result = await harness.restoreAsync(plan, service);

    assert.equal(result.outcome, RestoreOutcome.Restored);
    assert.deepEqual(await harness.snapshotAsync(), saved);
    assert.equal(Buffer.from((await harness.readAsync(RestoreFolder.presentOf(result.recovered), "g/new.txt", null)).content).toString("utf8"), "written into the folder after it was moved aside");
    await RestoreFolder.of(harness).assertCleanAsync();
  });

  it("lists in that checkpoint a moved-aside file that changes each time it is read as Changing", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const { checkpoint, saved } = await PreparedRestore.prepareAsync(harness);
    const plan = await harness.planAsync(checkpoint);
    const service = await harness.createServiceAsync(ServiceSeams.system.withJournals(file => new ScriptedJournal(file, async record => {
      if (record.type !== JournalRecordType.Cleaning)
        return;
      const aside = await asideOfAsync(harness, "a.txt");
      await writeFile(aside, "written after it was moved aside");
      harness.context.watchInput = (command, chunk) => {
        if (command === "fast-import" && chunk.startsWith("blob\ndata "))
          appendFileSync(aside, "z");
      };
    })));

    const result = await harness.restoreAsync(plan, service);

    assert.equal(result.outcome, RestoreOutcome.Restored);
    assert.deepEqual(result.recovered?.unreadPaths, [new UnreadPath("a.txt", UnreadReason.Changing, null)]);
    assert.deepEqual(await harness.snapshotAsync(), saved);
  });

  it("restores where another program removed a target after the checkpoint taken before the restore, and stages nothing for a plan that only deletes", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "a");
    const checkpoint = await harness.checkpointAsync(null);
    await harness.writeAsync("i.txt", "i");
    const plan = await harness.planAsync(checkpoint);
    const service = await harness.createServiceAsync(ServiceSeams.system.withJournals(file => new ScriptedJournal(file, async record => {
      if (record.type === JournalRecordType.Applying)
        await rm(path.join(harness.folder, "i.txt"));
    })));

    const result = await harness.restoreAsync(plan, service);

    assert.equal(result.outcome, RestoreOutcome.Restored);
    assert.equal(result.recovered, null);
    assert.deepEqual(await harness.snapshotAsync(), [["a.txt", base64("a")]]);
    await RestoreFolder.of(harness).assertCleanAsync();
  });

  it("keeps a folder it would remove that another program wrote into", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const { checkpoint, saved } = await PreparedRestore.prepareAsync(harness);
    const plan = await harness.planAsync(checkpoint);
    const service = await harness.createServiceAsync(ServiceSeams.system.withJournals(file => new ScriptedJournal(file, async record => {
      if (record.type === JournalRecordType.Applying)
        await writeFile(path.join(harness.folder, "k", "new.txt"), "written by another program");
    })));

    const result = await harness.restoreAsync(plan, service);

    assert.equal(result.outcome, RestoreOutcome.Restored);
    assert.deepEqual(await harness.snapshotAsync(), sorted([...saved, ["k", null], ["k/new.txt", base64("written by another program")]]));
    await RestoreFolder.of(harness).assertCleanAsync();
  });

  it("rolls back, keeping it, when another program puts a file where the restore creates a folder", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const { checkpoint } = await PreparedRestore.prepareAsync(harness);
    const plan = await harness.planAsync(checkpoint);
    const now = await harness.snapshotAsync();
    const service = await harness.createServiceAsync(ServiceSeams.system.withJournals(file => new ScriptedJournal(file, async record => {
      if (record.type === JournalRecordType.Applying)
        await writeFile(path.join(harness.folder, "c"), "a file where a folder goes");
    })));

    const result = await harness.restoreAsync(plan, service);

    assert.equal(result.outcome, RestoreOutcome.RolledBack);
    assert.deepEqual(await harness.snapshotAsync(), sorted([...now, ["c", base64("a file where a folder goes")]]));
    await RestoreFolder.of(harness).assertCleanAsync();
  });

  it("rolls back when a staged file is gone, keeping a folder it created that another program wrote into", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const { checkpoint } = await PreparedRestore.prepareAsync(harness);
    const plan = await harness.planAsync(checkpoint);
    const now = await harness.snapshotAsync();
    let placed = false;
    const service = await harness.createServiceAsync(ServiceSeams.system.withJournals(file => new ScriptedJournal(file, async record => {
      if (record.type === JournalRecordType.Applying) {
        const staged = (await scriptAsync(harness)).steps.filter(u => u.stage !== null);
        await rm(locationOf(harness, RestoreFolder.presentOf(staged.at(-1)?.stage ?? null)));
      }
      else if (record.type === JournalRecordType.Placing && !placed) {
        placed = true;
        await writeFile(path.join(harness.folder, "c", "new.txt"), "written by another program");
      }
    })));

    const result = await harness.restoreAsync(plan, service);

    assert.equal(result.outcome, RestoreOutcome.RolledBack);
    assert.deepEqual(await harness.snapshotAsync(), sorted([...now, ["c", null], ["c/new.txt", base64("written by another program")]]));
    await RestoreFolder.of(harness).assertCleanAsync();
  });

  const loseAsidesAsync = async (t: TestContext, loseBefore: boolean): Promise<AttemptedRestore> => {
    const harness = await CheckpointsHarness.startAsync(t);
    const { checkpoint } = await PreparedRestore.prepareAsync(harness);
    const plan = await harness.planAsync(checkpoint);
    const now = await harness.snapshotAsync();
    const loseBeforeAsync = async (before: string): Promise<void> => {
      if (loseBefore)
        await harness.gitAsync(["update-ref", "-d", `refs/checkpoints/${before}`]);
    };
    const service = await harness.createServiceAsync(ServiceSeams.system.withJournals(file => new ScriptedJournal(file, RestoreFolder.of(harness).losingAsides(loseBeforeAsync))));
    return new AttemptedRestore(harness, now, await harness.restoreAsync(plan, service));
  };

  it("makes again what another program removed from where the restore moved it, from the checkpoint taken before it, as it rolls back", async t => {
    const { harness, result, now } = await loseAsidesAsync(t, false);

    assert.equal(result.outcome, RestoreOutcome.RolledBack);
    assert.deepEqual(await harness.snapshotAsync(), now);
    await RestoreFolder.of(harness).assertCleanAsync();
  });

  it("holds up a path whose moved-aside item is gone when the checkpoint taken before the restore is gone too", async t => {
    const { harness, result } = await loseAsidesAsync(t, true);

    assert.equal(result.outcome, RestoreOutcome.HeldUp);
    assert.equal((await harness.captureAsync(null)).outcome, CaptureOutcome.HeldUp);
    assert.deepEqual(harness.context.events.get("checkpoints.restoreHeldUp")?.at(-1), { identity: CheckpointsHarness.identity, paths: ["i.txt"] });
  });

  it("renames a folder whose name differs only by letter case, and back as it rolls back", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("Docs/n.txt", "n");
    const checkpoint = await harness.checkpointAsync(null);
    const saved = await harness.snapshotAsync();
    await rename(path.join(harness.folder, "Docs"), path.join(harness.folder, "docs"));
    const now = await harness.snapshotAsync();
    const failing = await harness.createServiceAsync(ServiceSeams.system.withJournals(file => new ScriptedJournal(file, async record => {
      if (record.type === JournalRecordType.Placing)
        await rm(await stageOfAsync(harness, RestoreFolder.presentOf(record.step)));
    })));

    const rolledBack = await harness.restoreAsync(await harness.planAsync(checkpoint), failing);

    assert.equal(rolledBack.outcome, RestoreOutcome.RolledBack);
    assert.deepEqual(await harness.snapshotAsync(), now);

    const restored = await harness.restoreAsync(await harness.planAsync(checkpoint));

    assert.equal(restored.outcome, RestoreOutcome.Restored);
    assert.deepEqual(await harness.snapshotAsync(), saved);
    await RestoreFolder.of(harness).assertCleanAsync();
  });

  it("removes what it staged and changes nothing when it can't stage in the folder", { skip: AccessFixture.isRoot ? "root reads past any file mode" : false }, async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const { checkpoint } = await PreparedRestore.prepareAsync(harness);
    const plan = await harness.planAsync(checkpoint);
    const now = await harness.snapshotAsync();

    await AccessFixture.whileReadOnlyAsync(harness.folder, async () => {
      const result = await harness.restoreAsync(plan);

      assert.equal(result.outcome, RestoreOutcome.RolledBack);
      assert.equal(result.before?.label, "Before restore");
    });
    assert.deepEqual(await harness.snapshotAsync(), now);
    await RestoreFolder.of(harness).assertCleanAsync();
  });

  it("refuses a plan of a checkpoint that is gone, or of a folder that is gone", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const { checkpoint } = await PreparedRestore.prepareAsync(harness);
    const plan = await harness.planAsync(checkpoint);

    const gone = await harness.restoreAsync(RestorePlan.fromJson({ ...plan.toJson(), checkpoint: CheckpointsHarness.unknownId }));
    await rm(harness.folder, { recursive: true });
    const missing = await harness.restoreAsync(plan);

    assert.deepEqual([gone.outcome, missing.outcome], [RestoreOutcome.CheckpointMissing, RestoreOutcome.FolderMissing]);
  });

  it("refuses the plan when the checkpoint taken before the restore finds a planned file changed since it planned again", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const { checkpoint } = await PreparedRestore.prepareAsync(harness);
    const plan = await harness.planAsync(checkpoint);
    const service = await harness.createServiceAsync(ServiceSeams.system.withHasRoom(async () => {
      await writeFile(path.join(harness.folder, "a.txt"), "written by another program");
      return true;
    }));

    const result = await harness.restoreAsync(plan, service);

    assert.equal(result.outcome, RestoreOutcome.MovedOn);
    assert.equal(await readFile(path.join(harness.folder, "a.txt"), "utf8"), "written by another program");
  });

  it("refuses the plan when the checkpoint taken before the restore can't read a path in a folder the plan removes", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const { checkpoint } = await PreparedRestore.prepareAsync(harness);
    const plan = await harness.planAsync(checkpoint);
    const changing = path.join(harness.folder, "h", "new.txt");
    const service = await harness.createServiceAsync(ServiceSeams.system.withHasRoom(async () => {
      await harness.writeAsync("h/new.txt", "written by another program");
      harness.context.watchInput = (command, chunk) => {
        if (command === "fast-import" && chunk.startsWith("blob\ndata "))
          appendFileSync(changing, "z");
      };
      return true;
    }));

    const result = await harness.restoreAsync(plan, service);

    assert.equal(result.outcome, RestoreOutcome.MovedOn);
    assert.match(await readFile(changing, "utf8"), /^written by another programz+$/);
  });

  it("refuses a restore whose checkpoint taken before it would add over 1 GiB, with that size and the limit, and changes nothing", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const { checkpoint } = await PreparedRestore.prepareAsync(harness);
    const plan = await harness.planAsync(checkpoint);
    const listed = await harness.listAsync();
    const size = 10 * 1024 * 1024;
    const service = await harness.createServiceAsync(ServiceSeams.system.withHasRoom(async () => {
      for (let count = 0; count < 103; count++)
        truncateSync(await harness.writeAsync(`part-${String(count).padStart(3, "0")}.bin`, ""), size);
      return true;
    }));
    const now = await harness.snapshotAsync();

    const result = await harness.restoreAsync(plan, service);

    assert.deepEqual([result.outcome, result.before, result.contentLimit], [RestoreOutcome.TooLarge, null, 1024 * 1024 * 1024]);
    assert.ok((result.contentSize ?? 0) >= 103 * size);
    assert.deepEqual(await harness.listAsync(), listed);
    for (const name of (await readdir(harness.folder)).filter(u => u.startsWith("part-")))
      await rm(path.join(harness.folder, name));
    assert.deepEqual(await harness.snapshotAsync(), now);
  });

  it("gives FolderMissing when the folder goes away before the checkpoint taken before the restore", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const { checkpoint } = await PreparedRestore.prepareAsync(harness);
    const plan = await harness.planAsync(checkpoint);
    const service = await harness.createServiceAsync(ServiceSeams.system.withHasRoom(async () => {
      await rm(harness.folder, { recursive: true });
      return true;
    }));

    assert.equal((await harness.restoreAsync(plan, service)).outcome, RestoreOutcome.FolderMissing);
  });

  it("refuses captures and restores while its rollback can't finish, raises the held-up event, and finishes the rollback once it can", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const { checkpoint } = await PreparedRestore.prepareAsync(harness);
    const plan = await harness.planAsync(checkpoint);
    const now = await harness.snapshotAsync();
    const blocker = path.join(harness.folder, "a.txt");
    const restore = await harness.createServiceAsync(ServiceSeams.system.withJournals(file => new ScriptedJournal(file, async record => {
      if (record.type === JournalRecordType.Placing)
        await writeFile(blocker, "in the way");
    })));

    const result = await harness.restoreAsync(plan, restore);

    assert.equal(result.outcome, RestoreOutcome.HeldUp);
    assert.equal((await harness.captureAsync(null)).outcome, CaptureOutcome.HeldUp);
    assert.equal((await harness.previewAsync(checkpoint)).outcome, PreviewOutcome.HeldUp);
    assert.equal((await harness.restoreAsync(plan)).outcome, RestoreOutcome.HeldUp);
    assert.deepEqual(harness.context.events.get("checkpoints.restoreHeldUp")?.at(-1), { identity: CheckpointsHarness.identity, paths: ["a.txt"] });
    assert.equal(await readFile(blocker, "utf8"), "in the way");

    await rm(blocker);
    assert.equal((await harness.captureAsync(null)).outcome, CaptureOutcome.Captured);
    assert.deepEqual(await harness.snapshotAsync(), now);
    await RestoreFolder.of(harness).assertCleanAsync();
  });

  it("counts a restore done whose moved-aside items it can't remove yet, holds the folder up, and removes them once it can", { skip: AccessFixture.isRoot ? "root reads past any file mode" : false }, async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const { checkpoint, saved } = await PreparedRestore.prepareAsync(harness);
    const plan = await harness.planAsync(checkpoint);
    let held = "";
    const service = await harness.createServiceAsync(ServiceSeams.system.withJournals(file => new ScriptedJournal(file, async record => {
      if (record.type !== JournalRecordType.Cleaning)
        return;
      held = await asideOfAsync(harness, "g");
      await writeFile(path.join(held, "x.txt"), "written after it was moved aside");
      await AccessFixture.denyRemovingAsync(held);
    })));

    try {
      const result = await harness.restoreAsync(plan, service);

      assert.equal(result.outcome, RestoreOutcome.Restored);
      assert.equal(result.before?.label, "Before restore");
      assert.equal(result.recovered?.label, "Recovered after restore");
      assert.equal((await harness.captureAsync(null)).outcome, CaptureOutcome.HeldUp);
      assert.deepEqual(harness.context.events.get("checkpoints.restoreHeldUp")?.at(-1), { identity: CheckpointsHarness.identity, paths: [path.basename(path.dirname(held))] });
      assert.deepEqual(harness.context.events.get("checkpoints.restored"), []);

      await AccessFixture.allowRemovingAsync(held);
      assert.equal((await harness.captureAsync(null)).outcome, CaptureOutcome.Captured);
      assert.deepEqual(await harness.snapshotAsync(), saved);
      assert.deepEqual((await harness.listAsync()).filter(u => u.label === "Recovered after restore").map(u => u.id), [result.recovered?.id]);
      assert.equal(harness.context.events.get("checkpoints.restored")?.length, 1);
      await RestoreFolder.of(harness).assertCleanAsync();
    }
    finally {
      await releaseAsync(held);
    }
  });

  it("takes the checkpoint of the changed moved-aside items once when the restore stops after recording its id", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const { checkpoint, saved } = await PreparedRestore.prepareAsync(harness);
    const plan = await harness.planAsync(checkpoint);

    await StoppedRestore.stopAsync(harness, plan, StopPoint.afterFirst(JournalRecordType.Keeping), "writeAsideOnCleaning");
    const recovered = (await harness.listAsync()).filter(u => u.label === "Recovered after restore");

    assert.equal(recovered.length, 1);
    assert.equal(Buffer.from((await harness.readAsync(RestoreFolder.presentOf(recovered[0] ?? null), "a.txt", null)).content).toString("utf8"), "written after it was moved aside");
    assert.deepEqual(await harness.snapshotAsync(), saved);
    await RestoreFolder.of(harness).assertCleanAsync();
  });

  it("holds the folder up when its rollback can't remove its staging folder, and removes it once it can", { skip: AccessFixture.isRoot ? "root reads past any file mode" : false }, async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const { checkpoint } = await PreparedRestore.prepareAsync(harness);
    const plan = await harness.planAsync(checkpoint);
    const now = await harness.snapshotAsync();
    let held = "";
    let failed = false;
    const service = await harness.createServiceAsync(ServiceSeams.system.withJournals(file => new ScriptedJournal(file, async record => {
      if (record.type === JournalRecordType.Placing && !failed) {
        failed = true;
        await rm(await stageOfAsync(harness, RestoreFolder.presentOf(record.step)));
      }
      else if (record.type === JournalRecordType.RollingBack)
        held = await holdInStagingAsync(harness);
    })));

    try {
      const result = await harness.restoreAsync(plan, service);

      assert.equal(result.outcome, RestoreOutcome.HeldUp);
      assert.equal((await harness.captureAsync(null)).outcome, CaptureOutcome.HeldUp);
      assert.deepEqual(harness.context.events.get("checkpoints.restoreHeldUp")?.at(-1), { identity: CheckpointsHarness.identity, paths: [path.basename(path.dirname(held))] });

      await AccessFixture.allowRemovingAsync(held);
      assert.equal((await harness.captureAsync(null)).outcome, CaptureOutcome.Captured);
      assert.deepEqual(await harness.snapshotAsync(), now);
      await RestoreFolder.of(harness).assertCleanAsync();
    }
    finally {
      await releaseAsync(held);
    }
  });

  it("holds up the paths whose moved-aside items are gone while it can't stage them again, and writes them once it can", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const { checkpoint } = await PreparedRestore.prepareAsync(harness);
    const plan = await harness.planAsync(checkpoint);
    const now = await harness.snapshotAsync();
    let staging = "";
    const service = await harness.createServiceAsync(ServiceSeams.system.withJournals(file => new ScriptedJournal(file, async record => {
      if (record.type !== JournalRecordType.Placing || staging !== "")
        return;
      staging = locationOf(harness, await stagingOfAsync(harness));
      await rm(staging, { recursive: true });
      await writeFile(staging, "in the way of the staging folder");
    })));

    const result = await harness.restoreAsync(plan, service);

    assert.equal(result.outcome, RestoreOutcome.HeldUp);
    assert.equal((await harness.captureAsync(null)).outcome, CaptureOutcome.HeldUp);
    assert.deepEqual(harness.context.events.get("checkpoints.restoreHeldUp")?.at(-1), { identity: CheckpointsHarness.identity, paths: ["i.txt", "e", "a.txt", "é/ü.txt", "k/l.txt", "g/x.txt"] });

    await rm(staging);
    assert.equal((await harness.captureAsync(null)).outcome, CaptureOutcome.Captured);
    assert.deepEqual(await harness.snapshotAsync(), now);
    await RestoreFolder.of(harness).assertCleanAsync();
  });
});
