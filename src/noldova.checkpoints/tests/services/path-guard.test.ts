/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { lstat, mkdir, mkdtemp, realpath, rename, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import { RestoreFolderChangedException } from "../../src/exceptions/restore-folder-changed.exception.ts";
import { RestoreStepException } from "../../src/exceptions/restore-step.exception.ts";
import { PathGuard } from "../../src/services/path-guard.ts";

describe("PathGuard", { concurrency: true }, () => {
  const linkType = process.platform === "win32" ? "junction" : "dir";
  const folderAsync = async (t: TestContext): Promise<string> => {
    const folder = await realpath(await mkdtemp(path.join(tmpdir(), "path-guard-")));
    t.after(() => rm(folder, { recursive: true, force: true }));
    await mkdir(path.join(folder, "root", "a", "b"), { recursive: true });
    return folder;
  };
  const idOfAsync = async (location: string): Promise<string> => {
    const stats = await lstat(location, { bigint: true });
    return `${stats.dev}:${stats.ino}`;
  };
  const idsAsync = async (root: string): Promise<ReadonlyMap<string, string>> =>
    new Map([["", await idOfAsync(root)], ["a", await idOfAsync(path.join(root, "a"))], ["a/b", await idOfAsync(path.join(root, "a", "b"))]]);

  it("passes a path whose folders are the ones the plan read, and one under a folder it first sees", async t => {
    const root = path.join(await folderAsync(t), "root");
    const guard = new PathGuard(root, await idsAsync(root));

    await guard.checkAsync("a/b/c.txt");
    await mkdir(path.join(root, "a", "new"));
    await guard.checkFolderAsync("a/new");
    await guard.checkAsync("a/new/d.txt");
  });

  it("fails a path whose folder on its way became a link, naming the path", async t => {
    const folder = await folderAsync(t);
    const root = path.join(folder, "root");
    const guard = new PathGuard(root, await idsAsync(root));
    await rename(path.join(root, "a"), path.join(folder, "elsewhere"));
    await symlink(path.join(folder, "elsewhere"), path.join(root, "a"), linkType);

    await assert.rejects(guard.checkAsync("a/b/c.txt"), (error: unknown) => error instanceof RestoreFolderChangedException && error.path === "a/b/c.txt" && error.folder === "a"
      && error instanceof RestoreStepException);
  });

  it("fails a path whose folder on its way was replaced by another folder, and one it remembered", async t => {
    const folder = await folderAsync(t);
    const root = path.join(folder, "root");
    const guard = new PathGuard(root, await idsAsync(root));
    await mkdir(path.join(root, "new"));
    await guard.checkFolderAsync("new");
    await rename(path.join(root, "a"), path.join(folder, "a-old"));
    await mkdir(path.join(root, "a", "b"), { recursive: true });
    await rename(path.join(root, "new"), path.join(folder, "new-old"));
    await mkdir(path.join(root, "new"));

    await assert.rejects(guard.checkAsync("a/b/c.txt"), RestoreFolderChangedException);
    await assert.rejects(guard.checkAsync("new/d.txt"), RestoreFolderChangedException);
  });

  it("fails every path once the folder itself was replaced, naming it as the folder", async t => {
    const folder = await folderAsync(t);
    const root = path.join(folder, "root");
    const guard = new PathGuard(root, await idsAsync(root));
    await rename(root, path.join(folder, "root-old"));
    await mkdir(root);

    await assert.rejects(guard.checkAsync("c.txt"), (error: unknown) => error instanceof RestoreFolderChangedException && error.folder === ""
      && error.message === "The restore couldn't change c.txt: the folder isn't the folder the restore was planned on, or is now a link");
  });

  it("takes the new file id of a folder made again, for it and the folders under it, and keeps the others", async t => {
    const folder = await folderAsync(t);
    const root = path.join(folder, "root");
    await mkdir(path.join(root, "z"));
    const guard = new PathGuard(root, new Map([...await idsAsync(root), ["z", await idOfAsync(path.join(root, "z"))]]));
    await rename(path.join(root, "a"), path.join(folder, "a-old"));
    await mkdir(path.join(root, "a", "b"), { recursive: true });
    await rename(path.join(root, "z"), path.join(folder, "z-old"));
    await mkdir(path.join(root, "z"));

    await guard.renewAsync("a");

    await guard.checkAsync("a/b/c.txt");
    await assert.rejects(guard.checkAsync("z/d.txt"), RestoreFolderChangedException);
  });
});
