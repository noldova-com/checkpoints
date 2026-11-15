/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it, type TestContext } from "node:test";

import { FolderStore } from "../../src/models/folder-store.ts";
import { StoredObject } from "../../src/models/stored-object.ts";
import { ObjectReader } from "../../src/services/object.reader.ts";
import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";
import { HarnessedService } from "../fixtures/harnessed-service.fixture.ts";

describe("ObjectReader", { concurrency: true }, () => {
  const uncancelled: AbortSignal = new AbortController().signal;

  const startAsync = async (t: TestContext): Promise<HarnessedService<ObjectReader>> => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "alpha");
    await harness.writeAsync("b.txt", "beta");
    await harness.checkpointAsync(null);
    return new HarnessedService(new ObjectReader(await harness.createGitRunnerAsync()), new FolderStore(harness.context.moduleFolder, CheckpointsHarness.identity), harness);
  };

  const callsSince = (harness: CheckpointsHarness, start: number): readonly string[] => harness.context.requests.slice(start).map(u => u.arguments.join(" "));

  it("reads objects by their ids or by a reference and path, once each, with an info of each then a contents, in one cat-file --batch-command", async t => {
    const { service: reader, store, harness } = await startAsync(t);
    const [checkpoint] = await harness.listAsync();
    const reference = `refs/checkpoints/${String(checkpoint?.id)}`;
    const id = (await harness.gitAsync(["rev-parse", `${reference}:files/b.txt`])).toString("utf8").trim();
    const start = harness.context.requests.length;
    const written = harness.watchCatFile();

    const batch = await reader.readAsync(store, [`${reference}:files/a.txt`, id, id], Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, uncancelled);

    assert.deepEqual(batch.get(`${reference}:files/a.txt`), new StoredObject("blob", 5, Buffer.from("alpha")));
    assert.deepEqual(batch.get(id), new StoredObject("blob", 4, Buffer.from("beta")));
    assert.deepEqual(callsSince(harness, start), ["cat-file --batch-command --buffer"]);
    assert.deepEqual(written, [`info ${reference}:files/a.txt`, `info ${id}`, "flush", `contents ${reference}:files/a.txt`, `contents ${id}`, "flush"]);
  });

  it("keeps up to the bytes asked of each, and gives a name with no object as missing, without reading it", async t => {
    const { service: reader, store, harness } = await startAsync(t);
    const [checkpoint] = await harness.listAsync();
    const reference = `refs/checkpoints/${String(checkpoint?.id)}`;

    const one = await reader.readOneAsync(store, `${reference}:files/a.txt`, 2, Number.POSITIVE_INFINITY, uncancelled);
    const written = harness.watchCatFile();
    const none = await reader.readOneAsync(store, `${reference}:files/none.txt`, 2, Number.POSITIVE_INFINITY, uncancelled);

    assert.deepEqual([one.head.toString(), one.size, one.isWhole], ["al", 5, false]);
    assert.equal(none, StoredObject.Missing);
    assert.deepEqual(written, [`info ${reference}:files/none.txt`, "flush"]);
  });

  it("gives an object larger than the caller can use by its type and size alone, never reading its content", async t => {
    const { service: reader, store, harness } = await startAsync(t);
    const [checkpoint] = await harness.listAsync();
    const reference = `refs/checkpoints/${String(checkpoint?.id)}`;
    const written = harness.watchCatFile();

    const batch = await reader.readAsync(store, [`${reference}:files/a.txt`, `${reference}:files/b.txt`], 10, 4, uncancelled);

    assert.deepEqual(batch.get(`${reference}:files/a.txt`), new StoredObject("blob", 5, Buffer.alloc(0)));
    assert.deepEqual(batch.get(`${reference}:files/b.txt`), new StoredObject("blob", 4, Buffer.from("beta")));
    assert.deepEqual(written, [`info ${reference}:files/a.txt`, `info ${reference}:files/b.txt`, "flush", `contents ${reference}:files/b.txt`, "flush"]);
  });

  it("reads ten thousand objects, more than 1 MiB in all, in one batch, named by their ids and a few by reference and path, taking cat-file's answers while it writes the requests", async t => {
    const { service: reader, store, harness } = await startAsync(t);
    const contents = Array.from({ length: 10_000 }, (_, index) => String(index).padStart(5, "0").repeat(26));
    await harness.gitAsync(["fast-import", "--quiet"], [
      "commit refs/probes/many\ncommitter Probe <probe@host-1.example> 0 +0000\ndata 0\n",
      ...contents.map((u, index) => `M 100644 inline f${index}\ndata ${u.length}\n${u}\n`)
    ].join(""));
    const listed = (await harness.gitAsync(["ls-tree", "-z", "refs/probes/many"])).toString("utf8").split("\0").filter(u => u.length > 0);
    const ids = new Map(listed.map(u => u.split("\t")).map(([head, name]) => [name, head?.split(" ")[2]]));
    const names = contents.map((_, index) => index < 3 ? `refs/probes/many:f${index}` : String(ids.get(`f${index}`)));

    const batch = await reader.readAsync(store, names, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, uncancelled);

    assert.ok(contents.join("").length > 1024 * 1024);
    assert.deepEqual(names.map(u => batch.get(u).head.toString()), contents);
  });

  it("keeps its cat-file running between reads, and starts it again once it has crashed", async t => {
    const { service: reader, store, harness } = await startAsync(t);
    const [checkpoint] = await harness.listAsync();
    const name = `refs/checkpoints/${String(checkpoint?.id)}:files/a.txt`;
    const start = harness.context.requests.length;

    const first = await reader.readOneAsync(store, name, 10, 10, uncancelled);
    const second = await reader.readOneAsync(store, name, 10, 10, uncancelled);
    const started = callsSince(harness, start);
    await harness.context.started[start]?.owned.stopAsync();
    const third = await reader.readOneAsync(store, name, 10, 10, uncancelled);

    assert.deepEqual([first.head.toString(), second.head.toString(), third.head.toString()], ["alpha", "alpha", "alpha"]);
    assert.deepEqual(started, ["cat-file --batch-command --buffer"]);
    assert.deepEqual(callsSince(harness, start), ["cat-file --batch-command --buffer", "cat-file --batch-command --buffer"]);
  });

  it("runs no Git for no names", async t => {
    const { service: reader, store, harness } = await startAsync(t);
    const start = harness.context.requests.length;

    const batch = await reader.readAsync(store, [], 1, 1, uncancelled);

    assert.equal(batch.get("any"), StoredObject.Missing);
    assert.deepEqual(harness.commandsSince(start), []);
  });
});
