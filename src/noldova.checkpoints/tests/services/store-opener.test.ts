/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import { FolderStore } from "../../src/models/folder-store.ts";
import { GitLimits } from "../../src/models/git-limits.ts";
import { GitBuildLocator } from "../../src/services/git-build.locator.ts";
import { GitRunner } from "../../src/services/git-runner.ts";
import { StoreOpener } from "../../src/services/store-opener.ts";
import { CheckpointsContext } from "../fixtures/checkpoints-context.fixture.ts";
import { ContextService } from "../fixtures/context-service.fixture.ts";
import { ManualClock } from "../fixtures/manual-clock.fixture.ts";

describe("StoreOpener", { concurrency: true }, () => {
  const uncancelled: AbortSignal = new AbortController().signal;

  const startAsync = async (t: TestContext): Promise<ContextService<StoreOpener>> => {
    const root = await realpath(await mkdtemp(path.join(tmpdir(), "store-opener-")));
    t.after(() => rm(root, { recursive: true, force: true }));
    const context = new CheckpointsContext(t, root);
    const git = new GitRunner(context, await new GitBuildLocator(import.meta.dirname).locateAsync(process.platform, process.arch), new GitLimits(60_000, 60_000, 600_000, 10_000),
      new ManualClock());
    return new ContextService(new StoreOpener(git), new FolderStore(root, "project-1"), context, git);
  };

  it("creates the folder's bare repository the first time, with no template, beside the module's empty file and hooks folder", async t => {
    const { service: opener, store } = await startAsync(t);

    assert.equal(await StoreOpener.existsAsync(store), false);
    await opener.openAsync(store, uncancelled);

    assert.equal(await StoreOpener.existsAsync(store), true);
    assert.equal((await stat(store.emptyFile)).size, 0);
    assert.deepEqual(await readdir(store.hooksFolder), []);
    assert.equal((await readdir(store.gitFolder)).includes("hooks"), false);
    assert.equal(await readFile(store.attributesFile, "utf8"), "* -text -eol -filter -ident -working-tree-encoding\n");
  });

  it("lets through a failure to look for the store other than its not being there", async t => {
    const { store } = await startAsync(t);

    await assert.rejects(StoreOpener.existsAsync(new FolderStore(path.dirname(path.dirname(store.folder)), "a\0b")), { code: "ERR_INVALID_ARG_VALUE" });
  });

  it("writes the store's own configuration, with its paths quoted, so Git reads them back as they are", async t => {
    const { service: opener, store, git } = await startAsync(t);

    await opener.openAsync(store, uncancelled);
    const readAsync = async (key: string): Promise<string> => (await git.runAsync(store, "config", ["--get", key], "", uncancelled)).toString("utf8").trim();

    assert.equal(await readAsync("core.hooksPath"), store.hooksFolder);
    assert.equal(await readAsync("core.attributesFile"), store.emptyFile);
    assert.equal(await readAsync("core.excludesFile"), store.emptyFile);
    assert.equal(await readAsync("core.bare"), "true");
    assert.equal(await readAsync("gc.auto"), "0");
  });

  it("writes its configuration and attributes again at each opening, and creates the repository only once", async t => {
    const { service: opener, store, context } = await startAsync(t);

    await opener.openAsync(store, uncancelled);
    const config = await readFile(store.configFile, "utf8");
    await writeFile(store.configFile, "[core]\n\tbare = false\n");
    await writeFile(store.attributesFile, "* text\n");
    await opener.openAsync(store, uncancelled);

    assert.equal(await readFile(store.configFile, "utf8"), config);
    assert.equal(await readFile(store.attributesFile, "utf8"), "* -text -eol -filter -ident -working-tree-encoding\n");
    assert.equal(context.requests.filter(u => u.arguments[0] === "init").length, 1);
  });
});
