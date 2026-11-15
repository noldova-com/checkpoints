/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { appendFile, link, lstat, mkdir, mkdtemp, readdir, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import { PathKind, RestoreAction } from "@noldova/checkpoints.protocol";
import type { JsonObject } from "@noldova/context.json";

import { RestorePathChangedException } from "../../src/exceptions/restore-path-changed.exception.ts";
import { StagedFileMissingException } from "../../src/exceptions/staged-file-missing.exception.ts";
import { EntryKind } from "../../src/models/entry-kind.ts";
import { FolderStore } from "../../src/models/folder-store.ts";
import { IndexEntry } from "../../src/models/index-entry.ts";
import { JournalRecordType } from "../../src/models/journal-record-type.ts";
import { JournalRecord } from "../../src/models/journal-record.ts";
import { RestoreRun } from "../../src/models/restore-run.ts";
import { RestoreScript } from "../../src/models/restore-script.ts";
import { ScriptStep } from "../../src/models/script-step.ts";
import { WalkedEntry } from "../../src/models/walked-entry.ts";
import { FolderFileReader } from "../../src/services/folder-file.reader.ts";
import { FolderWalker } from "../../src/services/folder-walker.ts";
import { PathGuard } from "../../src/services/path-guard.ts";
import { RestoreApplier } from "../../src/services/restore-applier.ts";
import { RestoreJournal } from "../../src/services/restore-journal.ts";
import { RestorePaths } from "../../src/services/restore-paths.ts";
import { AccessFixture } from "../fixtures/access.fixture.ts";
import { CaseFixture } from "../fixtures/case.fixture.ts";
import { FailureFixture } from "../fixtures/failure.fixture.ts";

describe("RestoreApplier", { concurrency: true }, () => {
  const checkpoint = "01890a5d-ac96-774b-bcce-b302099a8057";
  const before = "01890a5d-ac96-774b-bcce-b302099a8058";
  const applier = new RestoreApplier(new FolderWalker(process.platform), process.platform, link);
  const storeOf = (folder: string): FolderStore => new FolderStore(path.join(path.dirname(folder), "module"), "id");
  const locationOf = (folder: string, relativePath: string): string => path.join(folder, ...relativePath.split("/"));
  const folderAsync = async (t: TestContext): Promise<string> => {
    const root = await realpath(await mkdtemp(path.join(tmpdir(), "restore-applier-")));
    t.after(() => rm(root, { recursive: true, force: true }));
    const folder = path.join(root, "folder");
    await mkdir(path.join(folder, ".~r1"), { recursive: true });
    await mkdir(storeOf(folder).folder, { recursive: true });
    return folder;
  };
  const writeAsync = async (folder: string, relativePath: string, text: string): Promise<string> => {
    const location = locationOf(folder, relativePath);
    await mkdir(path.dirname(location), { recursive: true });
    await writeFile(location, text);
    return location;
  };
  const fileIdAsync = async (location: string): Promise<string> => RestorePaths.fileIdOf(await lstat(location, { bigint: true }));
  const entryAsync = async (folder: string, relativePath: string): Promise<IndexEntry> => {
    const location = locationOf(folder, relativePath);
    return IndexEntry.of(new WalkedEntry(relativePath, location, EntryKind.File, await lstat(location, { bigint: true })), await FolderFileReader.objectIdOfAsync(location, false));
  };
  const scriptOf = (steps: readonly ScriptStep[], create: readonly string[] = [], remove: readonly string[] = [], folders: ReadonlyMap<string, string> = new Map()): RestoreScript =>
    new RestoreScript("r1", checkpoint, before, steps, create, remove, folders);
  const runOf = (folder: string, script: RestoreScript, entries: readonly IndexEntry[] = []): RestoreRun => {
    const store = storeOf(folder);
    const index = new Map<string, IndexEntry>();
    for (const entry of entries)
      index.set(entry.path, entry);
    return new RestoreRun(store, folder, script, new RestoreJournal(store.restoreFile), new PathGuard(folder, new Map()), index);
  };
  const deleting = (index: number, relativePath: string): ScriptStep => new ScriptStep(index, relativePath, RestoreAction.Delete, null, `.~r1/${index}.old`, null, null, null);
  const replacing = (index: number, relativePath: string): ScriptStep =>
    new ScriptStep(index, relativePath, RestoreAction.Replace, `.~r1/${index}`, `.~r1/${index}.old`, PathKind.File, "a".repeat(40), null);
  const writing = (index: number, relativePath: string): ScriptStep => new ScriptStep(index, relativePath, RestoreAction.Write, `.~r1/${index}`, null, PathKind.File, "a".repeat(40), null);
  const journalOf = (run: RestoreRun): readonly JsonObject[] => run.journal.records.map(t => t.toJson());
  const jsonOf = (...records: readonly JournalRecord[]): readonly JsonObject[] => records.map(t => t.toJson());

  it("orders a script's actions as moving aside, deepest path first, then creating folders, placing each staged file and removing folders", () => {
    const script = scriptOf([replacing(0, "a.txt"), deleting(1, "x/y.txt"), writing(2, "w.txt")], ["n"], ["m"]);

    assert.deepEqual(RestoreApplier.actionsOf(script).map(t => t.toJson()), jsonOf(
      JournalRecord.ofStep(JournalRecordType.Aside, 1),
      JournalRecord.ofStep(JournalRecordType.Aside, 0),
      JournalRecord.ofPath(JournalRecordType.Created, "n"),
      JournalRecord.ofStep(JournalRecordType.Placing, 0),
      JournalRecord.ofStep(JournalRecordType.Placing, 2),
      JournalRecord.ofPath(JournalRecordType.Removing, "m")));
  });

  it("moves aside, creates, places and removes in that order, journaling each action before it acts", async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, "a.txt", "a");
    await writeAsync(folder, "b.txt", "b");
    const replaced = await fileIdAsync(await writeAsync(folder, ".~r1/1", "b restored"));
    const written = await fileIdAsync(await writeAsync(folder, ".~r1/2", "c restored"));
    await mkdir(path.join(folder, "e"));
    const run = runOf(folder, scriptOf([deleting(0, "a.txt"), replacing(1, "b.txt"), writing(2, "c.txt")], ["d"], ["e"]),
      [await entryAsync(folder, "a.txt"), await entryAsync(folder, "b.txt")]);

    await applier.applyAsync(run, []);

    assert.deepEqual(journalOf(run), jsonOf(
      JournalRecord.ofStep(JournalRecordType.Aside, 0),
      JournalRecord.ofStep(JournalRecordType.Aside, 1),
      JournalRecord.ofPath(JournalRecordType.Created, "d"),
      JournalRecord.ofFile(JournalRecordType.Placing, 1, replaced),
      JournalRecord.ofFile(JournalRecordType.Placing, 2, written),
      JournalRecord.ofPath(JournalRecordType.Removing, "e")));
    assert.deepEqual((await readdir(folder)).sort(), [".~r1", "b.txt", "c.txt", "d"]);
    assert.deepEqual((await readdir(path.join(folder, ".~r1"))).sort(), ["0.old", "1.old"]);
    assert.deepEqual(await Promise.all(["b.txt", "c.txt", ".~r1/0.old", ".~r1/1.old"].map(u => readFile(locationOf(folder, u), "utf8"))), ["b restored", "c restored", "a", "b"]);
  });

  it("resumes at the last action its journal holds, redoing it without journaling it again, and leaves the actions ahead of it undone", async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, "a.txt", "a");
    await mkdir(path.join(folder, "e"));
    const run = runOf(folder, scriptOf([deleting(0, "a.txt")], ["d"], ["e"]));

    await applier.applyAsync(run, [JournalRecord.ofPath(JournalRecordType.Created, "d")]);

    assert.deepEqual(journalOf(run), jsonOf(JournalRecord.ofPath(JournalRecordType.Removing, "e")));
    assert.deepEqual((await readdir(folder)).sort(), [".~r1", "a.txt", "d"]);
  });

  it("checks an item its journal says it moved aside, when the move already happened, without moving or journaling it again", async t => {
    const folder = await folderAsync(t);
    const location = await writeAsync(folder, "a.txt", "a");
    const entry = await entryAsync(folder, "a.txt");
    await rename(location, locationOf(folder, ".~r1/0.old"));
    const run = runOf(folder, scriptOf([deleting(0, "a.txt")]), [entry]);

    await applier.applyAsync(run, [JournalRecord.ofStep(JournalRecordType.Aside, 0)]);

    assert.deepEqual(journalOf(run), []);
    assert.equal(await readFile(locationOf(folder, ".~r1/0.old"), "utf8"), "a");
  });

  it("moves nothing aside when nothing is at the path or at its moved-aside name", async t => {
    const folder = await folderAsync(t);
    const run = runOf(folder, scriptOf([deleting(0, "gone.txt")]));

    await applier.applyAsync(run, []);

    assert.deepEqual(journalOf(run), jsonOf(JournalRecord.ofStep(JournalRecordType.Aside, 0)));
    assert.deepEqual(await readdir(folder), [".~r1"]);
    assert.deepEqual(await readdir(path.join(folder, ".~r1")), []);
  });

  it("refuses to go on when an item it moved aside differs from the index in kind, size, time, file id or content, or the index lacks it", async t => {
    const changes: readonly ((entry: IndexEntry) => IndexEntry | null)[] = [
      u => new IndexEntry(u.path, EntryKind.Executable, u.size, u.modified, u.changed, u.fileId, u.objectId),
      u => new IndexEntry(u.path, u.kind, u.size + 1, u.modified, u.changed, u.fileId, u.objectId),
      u => new IndexEntry(u.path, u.kind, u.size, u.modified + 1n, u.changed, u.fileId, u.objectId),
      u => new IndexEntry(u.path, u.kind, u.size, u.modified, u.changed, `${u.fileId}0`, u.objectId),
      u => new IndexEntry(u.path, u.kind, u.size, u.modified, u.changed, u.fileId, "0".repeat(u.objectId.length)),
      () => null
    ];
    for (const change of changes) {
      const folder = await folderAsync(t);
      await writeAsync(folder, "a.txt", "a");
      const entry = change(await entryAsync(folder, "a.txt"));
      const run = runOf(folder, scriptOf([deleting(0, "a.txt")]), entry === null ? [] : [entry]);

      await assert.rejects(applier.applyAsync(run, []), new RestorePathChangedException("a.txt"));
    }
  });

  it("counts an item moved aside that it can't read as changed", { skip: AccessFixture.isRoot ? "root reads past any file mode" : false }, async t => {
    const folder = await folderAsync(t);
    const location = await writeAsync(folder, "a.txt", "a");
    const entry = await entryAsync(folder, "a.txt");
    const aside = locationOf(folder, ".~r1/0.old");
    await rename(location, aside);
    const run = runOf(folder, scriptOf([deleting(0, "a.txt")]), [entry]);

    await AccessFixture.whileDeniedAsync(aside, async () => {
      await assert.rejects(applier.applyAsync(run, [JournalRecord.ofStep(JournalRecordType.Aside, 0)]), new RestorePathChangedException("a.txt"));
    });
  });

  it("moves a folder aside whole, checking it by the file id its script keeps rather than by the index", async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, "dir/x.txt", "x");
    const run = runOf(folder, scriptOf([deleting(0, "dir")], [], [], new Map([["dir", await fileIdAsync(locationOf(folder, "dir"))]])));

    await applier.applyAsync(run, []);

    assert.deepEqual(journalOf(run), jsonOf(JournalRecord.ofStep(JournalRecordType.Aside, 0)));
    assert.equal(await readFile(locationOf(folder, ".~r1/0.old/x.txt"), "utf8"), "x");
  });

  it("refuses to go on when a folder it moved aside has another file id than its script keeps", async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, "dir/x.txt", "x");
    const run = runOf(folder, scriptOf([deleting(0, "dir")], [], [], new Map([["dir", `${await fileIdAsync(locationOf(folder, "dir"))}0`]])));

    await assert.rejects(applier.applyAsync(run, []), new RestorePathChangedException("dir"));
  });

  it("renames an empty folder it removes to the folder it creates when their names differ only in case, journaling the rename", async t => {
    const folder = await folderAsync(t);
    await mkdir(path.join(folder, "Dir"));
    const id = await fileIdAsync(path.join(folder, "Dir"));
    const run = runOf(folder, scriptOf([], ["dir"], ["Dir"]));

    await applier.applyAsync(run, []);

    assert.deepEqual(journalOf(run), jsonOf(JournalRecord.ofPath(JournalRecordType.Created, "dir"), JournalRecord.renamed("dir", "Dir"), JournalRecord.ofPath(JournalRecordType.Removing, "Dir")));
    assert.deepEqual((await readdir(folder)).sort(), [".~r1", "dir"]);
    assert.equal(await fileIdAsync(path.join(folder, "dir")), id);
  });

  it("never takes a folder that differs only in case and still holds items for the folder it creates", async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, "Dir/x.txt", "x");
    const run = runOf(folder, scriptOf([], ["dir"], ["Dir"]));

    await applier.applyAsync(run, []);

    assert.deepEqual(journalOf(run), jsonOf(JournalRecord.ofPath(JournalRecordType.Created, "dir"), JournalRecord.ofPath(JournalRecordType.Removing, "Dir")));
    assert.deepEqual((await readdir(folder)).sort(), await CaseFixture.ignoresCaseAsync() ? [".~r1", "Dir"] : [".~r1", "Dir", "dir"]);
    assert.equal(await readFile(path.join(folder, "Dir", "x.txt"), "utf8"), "x");
    assert.ok(RestorePaths.isFolder(await RestorePaths.lstatAsync(path.join(folder, "dir"))));
  });

  it("never takes the folder it creates for its own case twin", async t => {
    const folder = await folderAsync(t);
    await mkdir(path.join(folder, "dir"));
    const run = runOf(folder, scriptOf([], ["dir"], ["dir"]));

    await applier.applyAsync(run, []);

    assert.deepEqual(journalOf(run), jsonOf(JournalRecord.ofPath(JournalRecordType.Created, "dir"), JournalRecord.ofPath(JournalRecordType.Removing, "dir")));
  });

  it("leaves a folder to create that is already there as it is", async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, "d/x.txt", "x");
    const run = runOf(folder, scriptOf([], ["d"]));

    await applier.applyAsync(run, []);

    assert.deepEqual(journalOf(run), jsonOf(JournalRecord.ofPath(JournalRecordType.Created, "d")));
    assert.equal(await readFile(path.join(folder, "d", "x.txt"), "utf8"), "x");
  });

  it("passes over a file its journal says it placed, when the staged file is gone and the path holds the one it placed", async t => {
    const folder = await folderAsync(t);
    const location = await writeAsync(folder, "c.txt", "c restored");
    const run = runOf(folder, scriptOf([writing(0, "c.txt")]));

    await applier.applyAsync(run, [JournalRecord.ofFile(JournalRecordType.Placing, 0, await fileIdAsync(location))]);

    assert.deepEqual(journalOf(run), []);
    assert.equal(await readFile(location, "utf8"), "c restored");
  });

  it("fails naming a path whose staged file is gone when the path holds nothing it placed", async t => {
    const folder = await folderAsync(t);
    const run = runOf(folder, scriptOf([writing(0, "c.txt")]));

    await assert.rejects(applier.applyAsync(run, []), new StagedFileMissingException("c.txt"));
    await writeAsync(folder, "c.txt", "another program's");
    await assert.rejects(applier.applyAsync(run, [JournalRecord.ofFile(JournalRecordType.Placing, 0, "0:0")]), new StagedFileMissingException("c.txt"));
  });

  it("places a staged file its journal already holds as being placed without journaling it again", async t => {
    const folder = await folderAsync(t);
    const stage = await writeAsync(folder, ".~r1/0", "c restored");
    const run = runOf(folder, scriptOf([writing(0, "c.txt")]));

    await applier.applyAsync(run, [JournalRecord.ofFile(JournalRecordType.Placing, 0, await fileIdAsync(stage))]);

    assert.deepEqual(journalOf(run), []);
    assert.equal(await readFile(path.join(folder, "c.txt"), "utf8"), "c restored");
    assert.deepEqual(await readdir(path.join(folder, ".~r1")), []);
  });

  it("journals the copy it places when the volume won't make hard links", async t => {
    const noHardLinksAsync = async (): Promise<void> => {
      throw new FailureFixture("EPERM: operation not permitted, link", "EPERM");
    };
    const copying = new RestoreApplier(new FolderWalker(process.platform), process.platform, noHardLinksAsync);
    const folder = await folderAsync(t);
    const staged = await fileIdAsync(await writeAsync(folder, ".~r1/0", "c restored"));
    const run = runOf(folder, scriptOf([writing(0, "c.txt")]));

    await copying.applyAsync(run, []);

    assert.deepEqual(journalOf(run), jsonOf(JournalRecord.ofFile(JournalRecordType.Placing, 0, staged), JournalRecord.ofFile(JournalRecordType.Placed, 0, await fileIdAsync(path.join(folder, "c.txt")))));
    assert.equal(await readFile(path.join(folder, "c.txt"), "utf8"), "c restored");
    assert.deepEqual(await readdir(path.join(folder, ".~r1")), []);
  });

  it("keeps a folder to remove that holds items, that is gone, or whose name differs in case, journaling each", async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, "e/x.txt", "x");
    await mkdir(path.join(folder, "f"));
    const run = runOf(folder, scriptOf([], [], ["e", "gone", "F"]));

    await applier.applyAsync(run, []);

    assert.deepEqual(journalOf(run), jsonOf(JournalRecord.ofPath(JournalRecordType.Removing, "e"), JournalRecord.ofPath(JournalRecordType.Removing, "gone"), JournalRecord.ofPath(JournalRecordType.Removing, "F")));
    assert.deepEqual((await readdir(folder)).sort(), [".~r1", "e", "f"]);
    assert.equal(await readFile(path.join(folder, "e", "x.txt"), "utf8"), "x");
  });

  it("removes a folder its journal says it was removing without journaling it again", async t => {
    const folder = await folderAsync(t);
    await mkdir(path.join(folder, "e"));
    const run = runOf(folder, scriptOf([], [], ["e"]));

    await applier.applyAsync(run, [JournalRecord.ofPath(JournalRecordType.Removing, "e")]);

    assert.deepEqual(journalOf(run), []);
    assert.deepEqual(await readdir(folder), [".~r1"]);
  });

  it("finds each item moved aside that another program changed since, by its path, and passes over those unchanged or gone", async t => {
    const folder = await folderAsync(t);
    const first = await writeAsync(folder, "a.txt", "a");
    const second = await writeAsync(folder, "b.txt", "b");
    const entries = [await entryAsync(folder, "a.txt"), await entryAsync(folder, "b.txt")];
    await rename(first, locationOf(folder, ".~r1/0.old"));
    await rename(second, locationOf(folder, ".~r1/1.old"));
    await appendFile(locationOf(folder, ".~r1/1.old"), ", changed");
    const run = runOf(folder, scriptOf([deleting(0, "a.txt"), deleting(1, "b.txt"), deleting(2, "c.txt")]), entries);

    const changed = await applier.findChangedAsync(run);

    const aside = locationOf(folder, ".~r1/1.old");
    assert.deepEqual(changed, [new WalkedEntry("b.txt", aside, EntryKind.File, await lstat(aside, { bigint: true }))]);
  });

  it("passes over an item moved aside that is of no kind it keeps", { skip: process.platform === "win32" ? "Windows has no named pipe in a folder" : false }, async t => {
    const folder = await folderAsync(t);
    execFileSync("mkfifo", [locationOf(folder, ".~r1/0.old")]);
    const run = runOf(folder, scriptOf([deleting(0, "a.txt")]));

    assert.deepEqual(await applier.findChangedAsync(run), []);
  });

  it("finds each item in a folder moved aside, under the folder's path", async t => {
    const folder = await folderAsync(t);
    const deep = await writeAsync(folder, ".~r1/0.old/sub/y.txt", "y");
    const top = await writeAsync(folder, ".~r1/0.old/x.txt", "x");
    const run = runOf(folder, scriptOf([deleting(0, "dir")]));

    const changed = await applier.findChangedAsync(run);

    assert.deepEqual(changed, [
      new WalkedEntry("dir/sub/y.txt", deep, EntryKind.File, await lstat(deep, { bigint: true })),
      new WalkedEntry("dir/x.txt", top, EntryKind.File, await lstat(top, { bigint: true }))
    ]);
  });

  it("gives null when a folder moved aside holds a repository", async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, ".~r1/0.old/.git/HEAD", "ref: refs/heads/main\n");
    await writeAsync(folder, ".~r1/0.old/x.txt", "x");
    const run = runOf(folder, scriptOf([deleting(0, "dir")]));

    assert.equal(await applier.findChangedAsync(run), null);
  });

  it("flushes each folder a restore changed that is there, and passes over those that are gone", async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, "sub/a.txt", "a");
    const run = runOf(folder, scriptOf([writing(0, "sub/a.txt")], ["new"], ["gone/old"]));

    await RestoreApplier.flushAsync(run);

    assert.deepEqual((await readdir(folder)).sort(), [".~r1", "sub"]);
  });

  it("removes each item moved aside and the staging folder, whether or not they are there", async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, ".~r1/0.old", "a");
    await writeAsync(folder, ".~r1/2", "staged");
    const run = runOf(folder, scriptOf([deleting(0, "a.txt"), deleting(1, "dir")]));

    await RestoreApplier.removeAsideAsync(run);

    assert.deepEqual(await readdir(folder), []);
    await RestoreApplier.removeAsideAsync(run);
    assert.deepEqual(await readdir(folder), []);
  });
});
