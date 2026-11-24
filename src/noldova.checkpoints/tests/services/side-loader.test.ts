/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import "@noldova/context.core";
import { CaptureMode, PathKind, UnreadReason } from "@noldova/checkpoints.protocol";

import { StoreObjectMissingException, StoreObjectNotABlobException } from "../../src/api/index.ts";
import { EntryKind } from "../../src/models/entry-kind.ts";
import { FolderFile } from "../../src/models/folder-file.ts";
import { FolderStore } from "../../src/models/folder-store.ts";
import { ObjectBatch } from "../../src/models/object-batch.ts";
import { StoredObject } from "../../src/models/stored-object.ts";
import { TreeFile } from "../../src/models/tree-file.ts";
import { EntryReader } from "../../src/services/entry.reader.ts";
import { FolderWalker } from "../../src/services/folder-walker.ts";
import type { GitRunner } from "../../src/services/git-runner.ts";
import { ObjectReader } from "../../src/services/object.reader.ts";
import { SideLoader } from "../../src/services/side-loader.ts";
import { TreeLister } from "../../src/services/tree-lister.ts";
import { AccessFixture } from "../fixtures/access.fixture.ts";
import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";
import { HarnessedService } from "../fixtures/harnessed-service.fixture.ts";
import { JsonFixture } from "../fixtures/json.fixture.ts";

class AnsweringObjectReader extends ObjectReader {
  private readonly answer: StoredObject;
  private readonly name: string;

  public constructor(git: GitRunner, name: string, answer: StoredObject) {
    super(git);
    this.answer = answer;
    this.name = name;
  }

  public override async readAsync(store: FolderStore, names: readonly string[], keep: number, largest: number, signal: AbortSignal): Promise<ObjectBatch> {
    const read = await super.readAsync(store, names, keep, largest, signal);
    return new ObjectBatch(names, names.map(t => t === this.name ? this.answer : read.get(t)));
  }
}

describe("SideLoader", { concurrency: true }, () => {
  const uncancelled: AbortSignal = new AbortController().signal;

  const idOf = (content: string): string => createHash("sha1").update(`blob ${Buffer.byteLength(content)}\0`).update(content).digest("hex");

  const startAsync = async (t: TestContext): Promise<HarnessedService<SideLoader>> => {
    const harness = await CheckpointsHarness.startAsync(t);
    const git = await harness.createGitRunnerAsync();
    const loader = new SideLoader(new ObjectReader(git), new TreeLister(git), new FolderWalker(process.platform), new EntryReader(process.platform));
    return new HarnessedService(loader, new FolderStore(harness.context.moduleFolder, CheckpointsHarness.identity), harness);
  };

  it("loads a checkpoint's record and what it holds, with its empty folders and the paths it couldn't read", async t => {
    const { service: loader, store, harness } = await startAsync(t);
    await harness.writeAsync("a.txt", "alpha");
    await harness.writeAsync("logs/.git", "gitdir: x\n");
    const checkpoint = await harness.checkpointAsync("one");
    const tree = await harness.treeAsync(checkpoint);
    const stored = tree.get("files/a.txt");

    const loaded = await loader.loadCheckpointAsync(store, checkpoint.id, uncancelled);

    assert.ok(!Object.isNull(loaded) && !Object.isUndefined(stored));
    const { record, listing } = loaded;
    assert.deepEqual(record.checkpoint.toJson(), checkpoint.toJson());
    assert.deepEqual(listing.entryOf("a.txt"), new TreeFile(EntryKind.File, stored.objectId));
    assert.deepEqual([listing.emptyFolders, record.emptyFolders], [["logs"], ["logs"]]);
    assert.equal(listing.rules, null);
  });

  it("gives nothing for a checkpoint the folder doesn't have", async t => {
    const { service: loader, store, harness } = await startAsync(t);
    await harness.checkpointAsync(null);

    assert.equal(await loader.loadCheckpointAsync(store, CheckpointsHarness.unknownId, uncancelled), null);
  });

  it("loads the rules a checkpoint followed again from rules/, with its nested repositories and letter case", async t => {
    const { service: loader, store, harness } = await startAsync(t);
    await harness.writeAsync(".gitignore", "*.log\n");
    await harness.writeAsync("sub/.gitignore", "*.tmp\n");
    await harness.writeAsync("nested/.git/HEAD", "ref: refs/heads/main\n");
    await harness.writeAsync("a.txt", "a");
    harness.context.settings.write("checkpoints.followIgnoreFiles", true);
    const checkpoint = await harness.checkpointAsync(null);

    const loaded = await loader.loadCheckpointAsync(store, checkpoint.id, uncancelled);

    const rules = loaded?.listing.rules ?? null;
    assert.ok(!Object.isNull(rules));
    assert.equal(rules.ignoresCase, loaded?.record.ignoreRules?.ignoresCase);
    assert.deepEqual(rules.repositoryFolders, ["nested"]);
    assert.deepEqual(["a.log", "sub/b.tmp", "b.tmp", "nested/n.log", "a.txt"].map(u => rules.excludes(u, false)), [true, true, false, false, false]);
  });

  it("refuses a checkpoint whose ignore file the store lacks or gives as something other than a file's content, instead of reading that file as empty", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync(".gitignore", "*.log\n");
    harness.context.settings.write("checkpoints.followIgnoreFiles", true);
    const checkpoint = await harness.checkpointAsync(null);
    const git = await harness.createGitRunnerAsync();
    const store = new FolderStore(harness.context.moduleFolder, CheckpointsHarness.identity);
    const rulesId = idOf("*.log\n");
    const loadAsync = async (reader: ObjectReader): Promise<unknown> => await new SideLoader(reader, new TreeLister(git), new FolderWalker(process.platform), new EntryReader(process.platform)).loadCheckpointAsync(store, checkpoint.id, uncancelled);

    await assert.rejects(loadAsync(new AnsweringObjectReader(git, rulesId, new StoredObject("tree", 0, Buffer.alloc(0)))), new StoreObjectNotABlobException(rulesId, `${rulesId} tree 0`));
    await harness.deactivateAsync();
    await git.stopAllAsync();
    const objects = path.join(harness.store, "git", "objects");
    for (const pack of (await readdir(path.join(objects, "pack"))).filter(u => u.endsWith(".pack"))) {
      const content = await readFile(path.join(objects, "pack", pack));
      for (const part of (await readdir(path.join(objects, "pack"))).filter(u => u.startsWith(pack.slice(0, -".pack".length))))
        await rm(path.join(objects, "pack", part));
      await harness.gitAsync(["unpack-objects", "-q"], content);
    }
    await rm(path.join(objects, rulesId.slice(0, 2), rulesId.slice(2)));

    await assert.rejects(loadAsync(new ObjectReader(git)), new StoreObjectMissingException(rulesId));
  });

  it("walks the folder now in the mode given, hashing as Git would what the index can't vouch for, and writes nothing", async t => {
    const { service: loader, store, harness } = await startAsync(t);
    await harness.writeAsync(".gitignore", "*.log\n");
    await harness.writeAsync("a.txt", "alpha");
    await harness.writeAsync("same.txt", "same");
    await harness.checkpointAsync(null);
    const location = await harness.writeAsync("a.txt", "alpha 2");
    await harness.writeAsync("b.log", "log");
    await harness.writeAsync("empty/.git", "gitdir: x\n");
    const start = harness.context.requests.length;

    const every = await loader.loadFolderAsync(store, harness.folder, CaptureMode.EveryFile, uncancelled);
    assert.ok(!Object.isNull(every));
    const following = await loader.loadFolderAsync(store, harness.folder, CaptureMode.IgnoreFiles, uncancelled);
    assert.ok(!Object.isNull(following));

    const stats = await lstat(location, { bigint: true });
    assert.deepEqual(every.entryOf("a.txt"), new FolderFile(EntryKind.File, idOf("alpha 2"), location, 7, `${stats.dev}:${stats.ino}`));
    const same = every.entryOf("same.txt");
    assert.ok(same instanceof FolderFile);
    assert.equal(same.objectId, idOf("same"));
    assert.equal(every.entryOf("b.log")?.kind, PathKind.File);
    assert.deepEqual([every.emptyFolders, every.rules], [["empty"], null]);
    assert.equal(following.entryOf("b.log"), null);
    assert.equal(following.excludes("b.log", false), true);
    assert.deepEqual(harness.commandsSince(start), []);
  });

  it("takes the object the index holds for a file it still vouches for, without reading the file again", async t => {
    const { service: loader, store, harness } = await startAsync(t);
    await harness.writeAsync("a.txt", "alpha");
    await harness.checkpointAsync(null);
    const index = await harness.readStoreFileAsync("index");
    const later = CheckpointsHarness.vouchingStartOf(index);
    const entries = JsonFixture.objectsOf(index["entries"]).map(u => ({ ...u, objectId: idOf("planted") }));
    await writeFile(path.join(harness.store, "index"), JSON.stringify({ formatVersion: 1, start: later, entries }));

    const listing = await loader.loadFolderAsync(store, harness.folder, CaptureMode.EveryFile, uncancelled);
    assert.ok(!Object.isNull(listing));

    const planted = listing.entryOf("a.txt");
    assert.ok(planted instanceof FolderFile);
    assert.equal(planted.objectId, idOf("planted"));
  });

  it("gives a file another program replaced after the walk the file id, size and object of the file it read", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const git = await harness.createGitRunnerAsync();
    await harness.writeAsync("a.txt", "alpha");
    const location = path.join(harness.folder, "a.txt");
    const real = new FolderWalker(process.platform);
    const walker = new FolderWalker(process.platform);
    t.mock.method(walker, "walkAsync", async (folder: string, mode: CaptureMode, signal: AbortSignal) => {
      const walk = await real.walkAsync(folder, mode, signal);
      await writeFile(`${location}.new`, "replaced");
      await rename(`${location}.new`, location);
      return walk;
    });
    const loader = new SideLoader(new ObjectReader(git), new TreeLister(git), walker, new EntryReader(process.platform));

    const listing = await loader.loadFolderAsync(new FolderStore(harness.context.moduleFolder, CheckpointsHarness.identity), harness.folder, CaptureMode.EveryFile,
      uncancelled);
    assert.ok(!Object.isNull(listing));

    const now = (await real.walkAsync(harness.folder, CaptureMode.EveryFile, uncancelled))?.entries.find(u => u.path === "a.txt");
    assert.ok(!Object.isUndefined(now));
    assert.deepEqual(listing.entryOf("a.txt"), new FolderFile(EntryKind.File, idOf("replaced"), location, 8, now.fileId));
  });

  it("lists the folder now's paths it couldn't read, by the walk or by the reading, and walks it without an index", { skip: AccessFixture.isRoot ? "root reads past any file mode" : false }, async t => {
    const { service: loader, store, harness } = await startAsync(t);
    const secret = await harness.writeAsync("secret.txt", "s");
    await harness.writeAsync("closed/x.txt", "x");
    await harness.checkpointAsync(null);
    await rm(path.join(harness.store, "index"));

    await AccessFixture.whileDeniedAsync(secret, async () => {
      await AccessFixture.whileDeniedAsync(path.join(harness.folder, "closed"), async () => {
        const listing = await loader.loadFolderAsync(store, harness.folder, CaptureMode.EveryFile, uncancelled);
        assert.ok(!Object.isNull(listing));

        assert.deepEqual(["closed", "secret.txt"].map(u => listing.unreadReasonOf(u)), [UnreadReason.Denied, UnreadReason.Denied]);
        assert.deepEqual(listing.paths, ["closed", "secret.txt"]);
      });
    });
  });
});
