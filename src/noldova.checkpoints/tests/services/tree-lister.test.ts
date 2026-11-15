/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { mkdir, symlink } from "node:fs/promises";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import { UnknownGitModeException } from "../../src/api/index.ts";
import { EntryKind } from "../../src/models/entry-kind.ts";
import { FolderStore } from "../../src/models/folder-store.ts";
import { GitLimits } from "../../src/models/git-limits.ts";
import { TreeFile } from "../../src/models/tree-file.ts";
import { GitBuildLocator } from "../../src/services/git-build.locator.ts";
import { GitRunner } from "../../src/services/git-runner.ts";
import { TreeLister } from "../../src/services/tree-lister.ts";
import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";
import { HarnessedService } from "../fixtures/harnessed-service.fixture.ts";

describe("TreeLister", { concurrency: true }, () => {
  const uncancelled: AbortSignal = new AbortController().signal;

  const startAsync = async (t: TestContext): Promise<HarnessedService<TreeLister>> => {
    const harness = await CheckpointsHarness.startAsync(t);
    const git = new GitRunner(harness.context, await new GitBuildLocator(import.meta.dirname).locateAsync(process.platform, process.arch), new GitLimits(60_000, 60_000, 600_000, 10_000),
      harness.clock);
    return new HarnessedService(new TreeLister(git), new FolderStore(harness.context.moduleFolder, CheckpointsHarness.identity), harness);
  };

  it("lists a checkpoint's files and links by their paths in the folder, and its .gitignore files by their folders, in one diff-tree", async t => {
    const { service: lister, store, harness } = await startAsync(t);
    await harness.writeAsync(".gitignore", "*.log\n");
    await harness.writeAsync("sub/.gitignore", "*.tmp\n");
    await harness.writeAsync("a.txt", "a");
    await mkdir(path.join(harness.folder, "real"));
    await symlink(path.join(harness.folder, "real"), path.join(harness.folder, "out"), "junction");
    harness.context.settings.write("checkpoints.followIgnoreFiles", true);
    const checkpoint = await harness.checkpointAsync(null);
    const tree = await harness.treeAsync(checkpoint);
    const idOf = (treePath: string): string => {
      const entry = tree.get(treePath);
      assert.ok(entry !== undefined);
      return entry.objectId;
    };
    const start = harness.context.requests.length;

    const listing = await lister.listAsync(store, `refs/checkpoints/${checkpoint.id}`, uncancelled);

    assert.deepEqual(listing.files, new Map([
      [".gitignore", new TreeFile(EntryKind.File, idOf("files/.gitignore"))],
      ["a.txt", new TreeFile(EntryKind.File, idOf("files/a.txt"))],
      ["out", new TreeFile(EntryKind.Link, idOf("files/out"))],
      ["sub/.gitignore", new TreeFile(EntryKind.File, idOf("files/sub/.gitignore"))]
    ]));
    assert.deepEqual(listing.rules, new Map([["", idOf("rules/.gitignore")], ["sub", idOf("rules/sub/.gitignore")]]));
    assert.deepEqual(harness.commandsSince(start), ["diff-tree"]);
  });

  it("refuses a tree with a mode the module never writes, such as a submodule's", async t => {
    const { service: lister, store, harness } = await startAsync(t);
    const checkpoint = await harness.checkpointAsync(null);
    const commit = (await harness.gitAsync(["rev-parse", `refs/checkpoints/${checkpoint.id}`])).toString("utf8").trim();
    const files = (await harness.gitAsync(["mktree"], `160000 commit ${commit}\tsub\n`)).toString("utf8").trim();
    const root = (await harness.gitAsync(["mktree"], `040000 tree ${files}\tfiles\n`)).toString("utf8").trim();
    const planted = (await harness.gitAsync(["-c", "user.name=Test", "-c", "user.email=user-1@host-1.example", "commit-tree", root, "-m", "planted"])).toString("utf8").trim();

    await assert.rejects(lister.listAsync(store, planted, uncancelled),
      new UnknownGitModeException("160000"));
  });
});
