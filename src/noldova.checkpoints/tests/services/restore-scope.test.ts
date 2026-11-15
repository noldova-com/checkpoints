/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { mkdir, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { ChangeSide, KeepReason, KeptPath, PathKind, RestoreAction, RestoreOutcome, RestoreStep } from "@noldova/checkpoints.protocol";

import { CheckpointsHarness } from "../fixtures/checkpoints-harness.fixture.ts";
import { FailureFixture } from "../fixtures/failure.fixture.ts";

describe("A restore limited to paths", { concurrency: true }, () => {
  const text = (size: number): ChangeSide => new ChangeSide(PathKind.File, size, true);
  const contentOf = async (harness: CheckpointsHarness, relativePath: string): Promise<string | null> =>
    await readFile(path.join(harness.folder, ...relativePath.split("/")), "utf8").catch((error: unknown) => {
      if (!FailureFixture.hasCode(error, "ENOENT"))
        throw error;
      return null;
    });
  const pathsOf = async (harness: CheckpointsHarness): Promise<readonly string[]> => (await harness.snapshotAsync()).map(([t]) => t);

  it("restores a listed file and leaves every other change, and the stays outside the list, as they are", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync(".git/HEAD", "ref: refs/heads/main\n");
    await harness.writeAsync("a.txt", "a");
    await harness.writeAsync("b.txt", "b");
    const checkpoint = await harness.checkpointAsync(null);
    await harness.writeAsync("a.txt", "a 2");
    await harness.writeAsync("b.txt", "b 2");

    const plan = await harness.planAsync(checkpoint, ["a.txt"]);
    const result = await harness.restoreAsync(plan);

    assert.deepEqual([plan.steps, plan.stays, plan.paths], [[new RestoreStep("a.txt", RestoreAction.Replace, text(3), text(1))], [], ["a.txt"]]);
    assert.equal(result.outcome, RestoreOutcome.Restored);
    assert.deepEqual([await contentOf(harness, "a.txt"), await contentOf(harness, "b.txt")], ["a", "b 2"]);
  });

  it("restores everything under a listed folder, removing a folder the checkpoint doesn't hold, and nothing outside it", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("src/x.txt", "x");
    await harness.writeAsync("src/y.txt", "y");
    await harness.writeAsync("other.txt", "o");
    const checkpoint = await harness.checkpointAsync(null);
    await harness.writeAsync("src/x.txt", "x 2");
    await rm(path.join(harness.folder, "src", "y.txt"));
    await harness.writeAsync("src/new/z.txt", "z");
    await harness.writeAsync("other.txt", "o 2");

    const plan = await harness.planAsync(checkpoint, ["src"]);
    const result = await harness.restoreAsync(plan);

    assert.deepEqual(plan.steps, [
      new RestoreStep("src/new/z.txt", RestoreAction.Delete, text(1), null),
      new RestoreStep("src/x.txt", RestoreAction.Replace, text(3), text(1)),
      new RestoreStep("src/y.txt", RestoreAction.Write, null, text(1))
    ]);
    assert.equal(result.outcome, RestoreOutcome.Restored);
    assert.deepEqual(await pathsOf(harness), ["other.txt", "src", "src/x.txt", "src/y.txt"]);
    assert.deepEqual([await contentOf(harness, "src/x.txt"), await contentOf(harness, "src/y.txt"), await contentOf(harness, "other.txt")], ["x", "y", "o 2"]);
  });

  it("treats a rename across the list's edge as a deletion and an addition, restoring only the side whose path is listed", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("src/a.txt", "a");
    await harness.writeAsync("src/b.txt", "b");
    const checkpoint = await harness.checkpointAsync(null);
    await mkdir(path.join(harness.folder, "lib"));
    await rename(path.join(harness.folder, "src", "a.txt"), path.join(harness.folder, "lib", "a.txt"));

    const outOf = await harness.planAsync(checkpoint, ["src"]);
    const into = await harness.planAsync(checkpoint, ["lib"]);

    assert.deepEqual(outOf.steps, [new RestoreStep("src/a.txt", RestoreAction.Write, null, text(1))]);
    assert.deepEqual(into.steps, [new RestoreStep("lib/a.txt", RestoreAction.Delete, text(1), null)]);
    assert.equal((await harness.restoreAsync(into)).outcome, RestoreOutcome.Restored);
    assert.deepEqual(await pathsOf(harness), ["src", "src/b.txt"]);
  });

  it("restores after something outside the list changes since the preview, and leaves that change and an unlisted new folder as they are", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "a");
    await harness.writeAsync("b.txt", "b");
    const checkpoint = await harness.checkpointAsync(null);
    await harness.writeAsync("a.txt", "a 2");
    await mkdir(path.join(harness.folder, "e"));
    const plan = await harness.planAsync(checkpoint, ["a.txt"]);
    await harness.writeAsync("b.txt", "b, pulled");
    await harness.writeAsync("c.txt", "c");

    const result = await harness.restoreAsync(plan);

    assert.equal(result.outcome, RestoreOutcome.Restored);
    assert.deepEqual(await pathsOf(harness), ["a.txt", "b.txt", "c.txt", "e"]);
    assert.deepEqual([await contentOf(harness, "a.txt"), await contentOf(harness, "b.txt")], ["a", "b, pulled"]);
  });

  it("still refuses the plan when a listed path changes since the preview", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("a.txt", "a");
    const checkpoint = await harness.checkpointAsync(null);
    await harness.writeAsync("a.txt", "a 2");
    const plan = await harness.planAsync(checkpoint, ["a.txt"]);
    await harness.writeAsync("a.txt", "a 3");

    assert.equal((await harness.restoreAsync(plan)).outcome, RestoreOutcome.MovedOn);
    assert.equal(await contentOf(harness, "a.txt"), "a 3");
  });

  it("removes a new folder above a listed path only when everything in it is listed", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("keep.txt", "k");
    const checkpoint = await harness.checkpointAsync(null);
    await harness.writeAsync("made/one.txt", "1");
    await harness.writeAsync("shared/one.txt", "1");
    await harness.writeAsync("shared/other.txt", "2");

    const result = await harness.restoreAsync(await harness.planAsync(checkpoint, ["made/one.txt", "shared/one.txt"]));

    assert.equal(result.outcome, RestoreOutcome.Restored);
    assert.deepEqual(await pathsOf(harness), ["keep.txt", "shared", "shared/other.txt"]);
  });

  it("leaves a path above a listed one that the checkpoint doesn't hold as it is, such as a file now where the listed path was made", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("keep.txt", "k");
    const checkpoint = await harness.checkpointAsync(null);
    await harness.writeAsync("x/y.txt", "y");
    await rm(path.join(harness.folder, "x"), { recursive: true });
    await harness.writeAsync("x", "a file now");

    const plan = await harness.planAsync(checkpoint, ["x/y.txt"]);
    const result = await harness.restoreAsync(plan);

    assert.deepEqual([plan.steps, plan.stays], [[], []]);
    assert.equal(result.outcome, RestoreOutcome.Restored);
    assert.deepEqual([await pathsOf(harness), await contentOf(harness, "x")], [["keep.txt", "x"], "a file now"]);
  });

  it("leaves a sibling whose name starts with a listed folder's as it is", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("src/a.txt", "a");
    await harness.writeAsync("src2/a.txt", "a");
    const checkpoint = await harness.checkpointAsync(null);
    await harness.writeAsync("src/a.txt", "a 2");
    await harness.writeAsync("src2/a.txt", "a 2");

    const plan = await harness.planAsync(checkpoint, ["src"]);
    const result = await harness.restoreAsync(plan);

    assert.deepEqual(plan.steps, [new RestoreStep("src/a.txt", RestoreAction.Replace, text(3), text(1))]);
    assert.equal(result.outcome, RestoreOutcome.Restored);
    assert.deepEqual([await contentOf(harness, "src/a.txt"), await contentOf(harness, "src2/a.txt")], ["a", "a 2"]);
  });

  it("puts back a folder above a listed path that the folder now holds as a file, and reports a stay above a listed path", async t => {
    const harness = await CheckpointsHarness.startAsync(t);
    await harness.writeAsync("src/a.txt", "a");
    await harness.writeAsync("tool/x.ts", "x");
    const checkpoint = await harness.checkpointAsync(null);
    await rm(path.join(harness.folder, "src"), { recursive: true });
    await harness.writeAsync("src", "a file now");
    await harness.writeAsync("tool/.git/HEAD", "ref: refs/heads/main\n");
    await harness.writeAsync("tool/x.ts", "x 2");

    const plan = await harness.planAsync(checkpoint, ["src/a.txt", "tool/x.ts"]);

    assert.deepEqual(plan.steps, [
      new RestoreStep("src", RestoreAction.Replace, text(10), new ChangeSide(PathKind.Folder, null, false)),
      new RestoreStep("src/a.txt", RestoreAction.Write, null, text(1)),
      new RestoreStep("tool/x.ts", RestoreAction.Replace, text(3), text(1))
    ]);
    assert.deepEqual(plan.stays, [new KeptPath("tool", KeepReason.RepositoryFolder)]);
    assert.equal((await harness.restoreAsync(plan)).outcome, RestoreOutcome.Restored);
    assert.deepEqual([await contentOf(harness, "src/a.txt"), await contentOf(harness, "tool/x.ts")], ["a", "x"]);
  });
});
