/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CaptureRequest, DeleteFolderRequest, MissingFieldException, type Checkpoint } from "@noldova/checkpoints.protocol";

import { CheckpointFileMissingException, StoreFileUnreadableException } from "../../src/api/index.ts";
import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";

describe("CheckpointLister", { concurrency: true }, () => {
  const identity = ["-c", "user.name=Test", "-c", "user.email=user-1@host-1.example"];

  const plantAsync = async (harness: CheckpointsHarness, id: string, record: string | null): Promise<string> => {
    const blob = (await harness.gitAsync(["hash-object", "-w", "--stdin"], record ?? "")).toString("utf8").trim();
    const tree = (await harness.gitAsync(["mktree"], record === null ? "" : `100644 blob ${blob}\tcheckpoint.json\n`)).toString("utf8").trim();
    const commit = (await harness.gitAsync([...identity, "commit-tree", tree, "-m", "planted"])).toString("utf8").trim();
    await harness.gitAsync(["update-ref", `refs/checkpoints/${id}`, commit]);
    return commit;
  };

  it("lists none for a folder never captured, without starting Git", async t => {
    const harness = await CheckpointsHarness.startAsync(t);

    assert.deepEqual(await harness.listAsync(), []);
    assert.deepEqual(harness.context.requests, []);
  });

  it("lists a folder's checkpoints newest first, as their checkpoint.json keeps them, in one for-each-ref and one cat-file --batch --buffer", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "a");
    const first = await harness.checkpointAsync("first");
    const second = await harness.checkpointAsync(null);
    const third = await harness.checkpointAsync("third");
    const before = harness.context.requests.length;

    const listed = await harness.listAsync();

    assert.deepEqual(listed.map(u => u.toJson()), [third.toJson(), second.toJson(), first.toJson()]);
    assert.deepEqual(harness.context.requests.slice(before).map(u => u.arguments[0]), ["for-each-ref", "cat-file"]);
    assert.deepEqual(harness.context.requests[before + 1]?.arguments, ["cat-file", "--batch", "--buffer"]);
  });

  it("takes each checkpoint's parent as the folder's newest one before it", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const first = await harness.checkpointAsync(null);
    const second = await harness.checkpointAsync(null);

    const parent = (await harness.gitAsync(["rev-parse", `refs/checkpoints/${second.id}^`])).toString("utf8").trim();
    const firstCommit = (await harness.gitAsync(["rev-parse", `refs/checkpoints/${first.id}`])).toString("utf8").trim();
    const roots = (await harness.gitAsync(["rev-list", "--max-parents=0", `refs/checkpoints/${second.id}`])).toString("utf8").trim();

    assert.equal(parent, firstCommit);
    assert.equal(roots, firstCommit);
  });

  it("reads the newest checkpoint with one for-each-ref, then takes each capture's as the next one's parent, and reads it again after a delete", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    const start = harness.context.requests.length;
    const first = await harness.checkpointAsync(null);
    const firstCommands = harness.commandsSince(start);
    const second = await harness.checkpointAsync(null);
    const third = await harness.checkpointAsync(null);
    const commands = harness.commandsSince(start);
    const parentOf = async (checkpoint: Checkpoint): Promise<string> =>
      (await harness.gitAsync(["log", "-1", "--format=%P", `refs/checkpoints/${checkpoint.id}`])).toString("utf8").trim();
    const commitOf = async (checkpoint: Checkpoint): Promise<string> =>
      (await harness.gitAsync(["rev-parse", `refs/checkpoints/${checkpoint.id}`])).toString("utf8").trim();
    const [parents, commits] = [[await parentOf(first), await parentOf(second), await parentOf(third)], ["", await commitOf(first), await commitOf(second)]];
    await harness.service.deleteFolderAsync(new DeleteFolderRequest(harness.reference));
    const restart = harness.context.requests.length;
    const fourth = await harness.checkpointAsync(null);

    assert.deepEqual(firstCommands, ["init", "for-each-ref", "fast-import"]);
    assert.deepEqual(commands, firstCommands);
    assert.deepEqual(parents, commits);
    assert.deepEqual(harness.commandsSince(restart), ["init", "for-each-ref", "fast-import"]);
    assert.equal(await parentOf(fourth), "");
  });

  it("reads the newest checkpoint again after a capture that fails", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "a");
    const first = await harness.checkpointAsync(null);
    const cancel = new AbortController();
    harness.context.watchInput = command => {
      if (command === "fast-import")
        cancel.abort(new Error("cancelled by its caller"));
    };
    await assert.rejects(harness.service.captureAsync(new CaptureRequest(harness.reference, null), cancel.signal), /cancelled by its caller/);
    harness.context.watchInput = () => undefined;
    const start = harness.context.requests.length;

    const second = await harness.checkpointAsync(null);

    assert.deepEqual(harness.commandsSince(start), ["for-each-ref", "fast-import"]);
    const parent = (await harness.gitAsync(["log", "-1", "--format=%P", `refs/checkpoints/${second.id}`])).toString("utf8").trim();
    assert.equal(parent, (await harness.gitAsync(["rev-parse", `refs/checkpoints/${first.id}`])).toString("utf8").trim());
  });

  it("fails naming the commit when a checkpoint has no checkpoint.json", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.checkpointAsync(null);
    const commit = await plantAsync(harness, "ffffffff-ffff-7fff-bfff-ffffffffffff", null);

    await assert.rejects(harness.listAsync(), new CheckpointFileMissingException(commit));
  });

  it("lists a checkpoint whose checkpoint.json an earlier version wrote, in format version 1, its unread paths with no code", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.checkpointAsync(null);
    await plantAsync(harness, "ffffffff-ffff-7fff-bfff-ffffffffffff", "{\"formatVersion\":1,\"checkpoint\":{\"id\":\"ffffffff-ffff-7fff-bfff-ffffffffffff\","
      + "\"time\":\"2026-10-18T12:00:00.000Z\",\"mode\":\"EveryFile\",\"label\":null,\"unreadPaths\":[{\"path\":\"locked.db\",\"reason\":\"Denied\"}]},"
      + "\"emptyFolders\":[],\"links\":[],\"ignoreRules\":null}");

    const listed = await harness.listAsync();

    assert.deepEqual(listed[0]?.toJson(), {
      id: "ffffffff-ffff-7fff-bfff-ffffffffffff", time: "2026-10-18T12:00:00.000Z", mode: "EveryFile", label: null,
      unreadPaths: [{ path: "locked.db", reason: "Denied", code: null }]
    });
    assert.equal(listed.length, 2);
  });

  it("fails naming the file when a checkpoint's checkpoint.json isn't what the module wrote", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.checkpointAsync(null);
    await plantAsync(harness, "ffffffff-ffff-7fff-bfff-ffffffffffff", "{\"formatVersion\":1}");

    await assert.rejects(harness.listAsync(), (error: unknown) => error instanceof StoreFileUnreadableException && error.file === "checkpoint.json"
      && error.message === "The checkpoints store's checkpoint.json can't be read: CheckpointRecord.checkpoint is missing."
      && error.cause instanceof MissingFieldException);
  });
});
