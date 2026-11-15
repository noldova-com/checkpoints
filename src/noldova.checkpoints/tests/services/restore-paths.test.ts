/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import type { BigIntStats } from "node:fs";
import { chmod, link, lstat, mkdir, mkdtemp, readdir, readFile, readlink, realpath, rm, rmdir, symlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import { RestorePathInTheWayException } from "../../src/exceptions/restore-path-in-the-way.exception.ts";
import { RestoreStepFailedException } from "../../src/exceptions/restore-step-failed.exception.ts";
import { RestorePaths } from "../../src/services/restore-paths.ts";
import { AccessFixture } from "../fixtures/access.fixture.ts";
import { FailureFixture } from "../fixtures/failure.fixture.ts";
import { LinkFixture } from "../fixtures/link.fixture.ts";

describe("RestorePaths", { concurrency: true }, () => {
  const folderAsync = async (t: TestContext): Promise<string> => {
    const folder = await mkdtemp(path.join(tmpdir(), "restore-paths-"));
    t.after(() => rm(folder, { recursive: true, force: true }));
    return folder;
  };
  const taken = RestorePathInTheWayException;
  const noRecordAsync = async (): Promise<void> => undefined;
  const noHardLinksAsync = async (): Promise<void> => {
    throw new FailureFixture("EPERM: operation not permitted, link", "EPERM");
  };
  const stagedFileLinkAsync = async (folder: string): Promise<void> =>
    await LinkFixture.symlinkAsync("target.txt", path.join(folder, "staged-file"), "file");

  it("places a relative path in the folder, the folder itself for \"\"", () => {
    assert.equal(RestorePaths.locationOf(path.join("/f"), "a/b.txt"), path.join("/f", "a", "b.txt"));
    assert.equal(RestorePaths.locationOf(path.join("/f"), ""), path.join("/f"));
  });

  it("reads what is at a location without following a link, and nothing where nothing is", async t => {
    const folder = await folderAsync(t);
    await mkdir(path.join(folder, "dir"));
    await symlink(path.join(folder, "dir"), path.join(folder, "link"), process.platform === "win32" ? "junction" : "dir");

    assert.equal(RestorePaths.isFolder(await RestorePaths.lstatAsync(path.join(folder, "dir"))), true);
    assert.equal(RestorePaths.isFolder(await RestorePaths.lstatAsync(path.join(folder, "link"))), false);
    assert.equal(await RestorePaths.lstatAsync(path.join(folder, "missing")), null);
    assert.equal(await RestorePaths.lstatAsync(path.join(folder, "missing", "under")), null);
  });

  it("lets through a failure to read a location other than nothing being there", async () => {
    await assert.rejects(RestorePaths.lstatAsync("a\0b"), { code: "ERR_INVALID_ARG_VALUE" });
  });

  it("tells an empty folder from one that holds an entry, a file and a link to a folder", async t => {
    const folder = await folderAsync(t);
    await mkdir(path.join(folder, "empty"));
    await mkdir(path.join(folder, "full"));
    await writeFile(path.join(folder, "full", "a.txt"), "a");
    await symlink(path.join(folder, "empty"), path.join(folder, "link"), process.platform === "win32" ? "junction" : "dir");

    assert.deepEqual(await Promise.all(["empty", "full", path.join("full", "a.txt"), "link", "missing"].map(t => RestorePaths.isEmptyFolderAsync(path.join(folder, t)))),
      [true, false, false, false, false]);
  });

  it("tells a name the folder lists exactly from one the system finds under another letter case", async t => {
    const folder = await folderAsync(t);
    await writeFile(path.join(folder, "Readme.md"), "r");

    assert.equal(await RestorePaths.hasExactNameAsync(path.join(folder, "Readme.md")), true);
    assert.equal(await RestorePaths.hasExactNameAsync(path.join(folder, "README.md")), false);
  });

  it("places a file by a hard link that keeps its file id, then removes its old name", async t => {
    const folder = await folderAsync(t);
    await writeFile(path.join(folder, "staged"), "new");
    const staged = await lstat(path.join(folder, "staged"), { bigint: true });
    const copies: BigIntStats[] = [];

    await RestorePaths.placeAsync("a.txt", path.join(folder, "staged"), staged, path.join(folder, "a.txt"), taken, async u => void copies.push(u), link, []);

    assert.deepEqual(await readdir(folder), ["a.txt"]);
    assert.equal(RestorePaths.fileIdOf(await lstat(path.join(folder, "a.txt"), { bigint: true })), RestorePaths.fileIdOf(staged));
    assert.deepEqual(copies, []);
  });

  it("never places a file over one another program put at its name, and finishes a placement that stopped before its old name went", async t => {
    const folder = await folderAsync(t);
    await writeFile(path.join(folder, "staged"), "new");
    await writeFile(path.join(folder, "a.txt"), "another program's");
    const staged = await lstat(path.join(folder, "staged"), { bigint: true });

    await assert.rejects(RestorePaths.placeAsync("a.txt", path.join(folder, "staged"), staged, path.join(folder, "a.txt"), taken, noRecordAsync, link, []),
      new RestorePathInTheWayException("a.txt"));
    assert.equal(await readFile(path.join(folder, "a.txt"), "utf8"), "another program's");

    await link(path.join(folder, "staged"), path.join(folder, "b.txt"));
    await RestorePaths.placeAsync("b.txt", path.join(folder, "staged"), staged, path.join(folder, "b.txt"), taken, noRecordAsync, link, []);
    assert.deepEqual((await readdir(folder)).sort(), ["a.txt", "b.txt"]);
  });

  it("places a file by a copy where the volume makes no hard link, created on a free name and its file id given before its content, times and mode", async t => {
    const folder = await folderAsync(t);
    await writeFile(path.join(folder, "staged"), "new");
    await chmod(path.join(folder, "staged"), 0o754);
    await utimes(path.join(folder, "staged"), new Date("2026-01-02T03:04:05.000Z"), new Date("2026-01-02T03:04:05.000Z"));
    const staged = await lstat(path.join(folder, "staged"), { bigint: true });
    const copies: BigIntStats[] = [];
    const created: bigint[] = [];

    await RestorePaths.placeAsync("a.txt", path.join(folder, "staged"), staged, path.join(folder, "a.txt"), taken, async u => {
      copies.push(u);
      created.push((await lstat(path.join(folder, "a.txt"), { bigint: true })).size);
    }, noHardLinksAsync, []);

    const placed = await lstat(path.join(folder, "a.txt"), { bigint: true });
    assert.deepEqual(await readdir(folder), ["a.txt"]);
    assert.equal(await readFile(path.join(folder, "a.txt"), "utf8"), "new");
    assert.equal(placed.mtime.getTime(), Date.parse("2026-01-02T03:04:05.000Z"));
    assert.equal(placed.mode, staged.mode);
    assert.deepEqual(copies.map(u => RestorePaths.fileIdOf(u)), [RestorePaths.fileIdOf(placed)]);
    assert.deepEqual(created, [0n]);
    assert.notEqual(RestorePaths.fileIdOf(placed), RestorePaths.fileIdOf(staged));
  });

  it("removes a copy whose record fails, so its name is free again and the item keeps its old name", async t => {
    const folder = await folderAsync(t);
    await writeFile(path.join(folder, "staged"), "new");
    const staged = await lstat(path.join(folder, "staged"), { bigint: true });
    const failingAsync = async (): Promise<void> => {
      throw new Error("the journal can't be written");
    };

    await assert.rejects(RestorePaths.placeAsync("a.txt", path.join(folder, "staged"), staged, path.join(folder, "a.txt"), taken, failingAsync, noHardLinksAsync, []),
      (error: unknown) => error instanceof RestoreStepFailedException && error.path === "a.txt"
      && error.cause instanceof Error && error.cause.message === "the journal can't be written");

    assert.deepEqual(await readdir(folder), ["staged"]);
  });

  it("never copies a file over another program's, even one of the same bytes, and makes again a copy the journal recorded, which a stop may have left part written", async t => {
    const folder = await folderAsync(t);
    await writeFile(path.join(folder, "staged"), "new");
    await writeFile(path.join(folder, "same-size.txt"), "old");
    await writeFile(path.join(folder, "same-bytes.txt"), "new");
    await writeFile(path.join(folder, "part.txt"), "ne");
    const staged = await lstat(path.join(folder, "staged"), { bigint: true });
    const copies: BigIntStats[] = [];

    for (const name of ["same-size.txt", "same-bytes.txt"])
      await assert.rejects(RestorePaths.placeAsync(name, path.join(folder, "staged"), staged, path.join(folder, name), taken, async u => void copies.push(u), noHardLinksAsync, []),
        (error: unknown) => error instanceof RestorePathInTheWayException);
    assert.deepEqual([await readFile(path.join(folder, "same-size.txt"), "utf8"), await readFile(path.join(folder, "same-bytes.txt"), "utf8")], ["old", "new"]);
    assert.deepEqual(copies, []);

    const part = RestorePaths.fileIdOf(await lstat(path.join(folder, "part.txt"), { bigint: true }));
    await RestorePaths.placeAsync("part.txt", path.join(folder, "staged"), staged, path.join(folder, "part.txt"), taken, noRecordAsync, noHardLinksAsync, [RestorePaths.fileIdOf(staged), part]);
    assert.deepEqual((await readdir(folder)).sort(), ["part.txt", "same-bytes.txt", "same-size.txt"]);
    assert.equal(await readFile(path.join(folder, "part.txt"), "utf8"), "new");
  });

  it("fails a file whose new name is on another volume, as a rename there would", async t => {
    const folder = await folderAsync(t);
    await writeFile(path.join(folder, "staged"), "new");
    const otherVolumeAsync = async (): Promise<void> => {
      throw new FailureFixture("EXDEV: cross-device link not permitted", "EXDEV");
    };

    await assert.rejects(RestorePaths.placeAsync("a.txt", path.join(folder, "staged"), await lstat(path.join(folder, "staged"), { bigint: true }), path.join(folder, "a.txt"),
      taken, noRecordAsync, otherVolumeAsync, []), (error: unknown) => error instanceof RestoreStepFailedException && error.message.includes("EXDEV"));
    assert.deepEqual(await readdir(folder), ["staged"]);
  });

  it("lets a hard-link failure other than the volume making none through, and makes no copy", async t => {
    const folder = await folderAsync(t);
    await writeFile(path.join(folder, "staged"), "new");
    const failingAsync = async (): Promise<void> => {
      throw new FailureFixture("EIO: i/o error, link", "EIO");
    };

    await assert.rejects(RestorePaths.placeAsync("a.txt", path.join(folder, "staged"), await lstat(path.join(folder, "staged"), { bigint: true }), path.join(folder, "a.txt"),
      taken, noRecordAsync, failingAsync, []), (error: unknown) => error instanceof RestoreStepFailedException && error.message.includes("EIO"));
    assert.deepEqual(await readdir(folder), ["staged"]);
  });

  it("places a link by a new link to the same target, a file's, a folder's or a missing one's, and gives its file id", async t => {
    const folder = await folderAsync(t);
    await writeFile(path.join(folder, "target.txt"), "target");
    await mkdir(path.join(folder, "dir"));
    await stagedFileLinkAsync(folder);
    await symlink("dir", path.join(folder, "staged-dir"), "dir");
    await symlink("missing.txt", path.join(folder, "staged-missing"), "file");
    const copies: string[] = [];

    for (const [staged, name] of [["staged-file", "file"], ["staged-dir", "dir-link"], ["staged-missing", "missing"]] as const) {
      const moving = await lstat(path.join(folder, staged), { bigint: true });
      await RestorePaths.placeAsync(name, path.join(folder, staged), moving, path.join(folder, name), taken, async u => void copies.push(RestorePaths.fileIdOf(u)), link, []);
    }

    assert.deepEqual((await readdir(folder)).sort(), ["dir", "dir-link", "file", "missing", "target.txt"]);
    assert.deepEqual(await Promise.all(["file", "dir-link", "missing"].map(u => readlink(path.join(folder, u)))), ["target.txt", "dir", "missing.txt"]);
    assert.deepEqual(copies, await Promise.all(["file", "dir-link", "missing"].map(async u => RestorePaths.fileIdOf(await lstat(path.join(folder, u), { bigint: true })))));
  });

  it("never places a link over what another program put at its name, and finishes one that stopped before its old name went", async t => {
    const folder = await folderAsync(t);
    await writeFile(path.join(folder, "target.txt"), "target");
    await writeFile(path.join(folder, "a.txt"), "another program's");
    await stagedFileLinkAsync(folder);
    await symlink("other.txt", path.join(folder, "b"), "file");
    await symlink("target.txt", path.join(folder, "c"), "file");
    const moving = await lstat(path.join(folder, "staged-file"), { bigint: true });

    for (const name of ["a.txt", "b"])
      await assert.rejects(RestorePaths.placeAsync(name, path.join(folder, "staged-file"), moving, path.join(folder, name), taken, noRecordAsync, link, []),
        (error: unknown) => error instanceof RestorePathInTheWayException);
    assert.deepEqual([await readFile(path.join(folder, "a.txt"), "utf8"), await readlink(path.join(folder, "b"))], ["another program's", "other.txt"]);

    await RestorePaths.placeAsync("c", path.join(folder, "staged-file"), moving, path.join(folder, "c"), taken, noRecordAsync, link, []);
    assert.deepEqual((await readdir(folder)).sort(), ["a.txt", "b", "c", "target.txt"]);
  });

  it("places a link to a folder, or to one that is gone, by a new link, never over what another program put at its name", async t => {
    const folder = await folderAsync(t);
    await LinkFixture.requireAsync(folder);
    await mkdir(path.join(folder, "dir"));
    await mkdir(path.join(folder, "gone"));
    await mkdir(path.join(folder, "other"));
    await writeFile(path.join(folder, "taken.txt"), "another program's");
    const kind = process.platform === "win32" ? "junction" : "dir";
    for (const [name, target] of [["staged", "dir"], ["staged-gone", "gone"], ["staged-taken", "dir"], ["taken-link", "other"]] as const)
      await symlink(path.join(folder, target), path.join(folder, name), kind);
    await rmdir(path.join(folder, "gone"));
    const placeAsync = async (staged: string, name: string): Promise<void> =>
      await RestorePaths.placeAsync(name, path.join(folder, staged), await lstat(path.join(folder, staged), { bigint: true }), path.join(folder, name), taken, noRecordAsync, link, []);

    for (const name of ["taken.txt", "taken-link"])
      await assert.rejects(placeAsync("staged-taken", name), new RestorePathInTheWayException(name));
    assert.deepEqual([await readFile(path.join(folder, "taken.txt"), "utf8"), await realpath(path.join(folder, "taken-link"))],
      ["another program's", await realpath(path.join(folder, "other"))]);
    await placeAsync("staged", "l");
    await placeAsync("staged-gone", "m");
    assert.deepEqual([await realpath(path.join(folder, "l")), await readlink(path.join(folder, "m"))], [await realpath(path.join(folder, "dir")), await readlink(path.join(folder, "staged-taken")).then(u => path.join(path.dirname(u), "gone"))]);
    assert.deepEqual((await readdir(folder)).sort(), ["dir", "l", "m", "other", "staged-taken", "taken-link", "taken.txt"]);
  });

  it("places a link to a target that isn't there, or whose folder isn't, as a link to a file", async t => {
    const folder = await folderAsync(t);
    await writeFile(path.join(folder, "target.txt"), "target");
    await stagedFileLinkAsync(folder);
    await symlink("missing.txt", path.join(folder, "staged-missing"), "file");
    await symlink(path.join("target.txt", "under"), path.join(folder, "staged-under"), "file");

    for (const [staged, name] of [["staged-missing", "missing"], ["staged-under", "under"]] as const)
      await RestorePaths.placeAsync(name, path.join(folder, staged), await lstat(path.join(folder, staged), { bigint: true }), path.join(folder, name), taken, noRecordAsync, link, []);

    assert.deepEqual(await Promise.all(["missing", "under"].map(u => readlink(path.join(folder, u)))), ["missing.txt", path.join("target.txt", "under")]);
    assert.deepEqual((await readdir(folder)).sort(), ["missing", "staged-file", "target.txt", "under"]);
  });

  it("places a link to a target the system won't let it look at as a link to a file", { skip: AccessFixture.isRoot ? "root reads past any file mode" : false }, async t => {
    const folder = await folderAsync(t);
    await mkdir(path.join(folder, "closed"));
    await writeFile(path.join(folder, "closed", "secret.txt"), "secret");
    await stagedFileLinkAsync(folder);
    await symlink(path.join("closed", "secret.txt"), path.join(folder, "staged-closed"), "file");
    const moving = await lstat(path.join(folder, "staged-closed"), { bigint: true });

    await AccessFixture.whileDeniedAsync(path.join(folder, "closed"), async () => {
      await RestorePaths.placeAsync("link", path.join(folder, "staged-closed"), moving, path.join(folder, "link"), taken, noRecordAsync, link, []);
    });

    assert.equal(await readlink(path.join(folder, "link")), path.join("closed", "secret.txt"));
    assert.deepEqual((await readdir(folder)).sort(), ["closed", "link", "staged-file"]);
  });

  it("places a link whose target is a loop of links as a link to a file", async t => {
    const folder = await folderAsync(t);
    await stagedFileLinkAsync(folder);
    await symlink("loop-b", path.join(folder, "loop-a"), "file");
    await symlink("loop-a", path.join(folder, "loop-b"), "file");
    await symlink("loop-a", path.join(folder, "staged-loop"), "file");

    await RestorePaths.placeAsync("link", path.join(folder, "staged-loop"), await lstat(path.join(folder, "staged-loop"), { bigint: true }), path.join(folder, "link"),
      taken, noRecordAsync, link, []);

    assert.equal(await readlink(path.join(folder, "link")), "loop-a");
    assert.deepEqual((await readdir(folder)).sort(), ["link", "loop-a", "loop-b", "staged-file"]);
  });

  it("fails a link whose target it can't look at for another reason, keeping its old name", { skip: process.platform === "win32" ? "Windows reports a name too long as not there" : false }, async t => {
    const folder = await folderAsync(t);
    await stagedFileLinkAsync(folder);
    await symlink("x".repeat(300), path.join(folder, "staged-long"), "file");

    await assert.rejects(RestorePaths.placeAsync("link", path.join(folder, "staged-long"), await lstat(path.join(folder, "staged-long"), { bigint: true }),
      path.join(folder, "link"), taken, noRecordAsync, link, []), (error: unknown) => error instanceof RestoreStepFailedException && error.path === "link"
      && error.cause instanceof Error && "code" in error.cause && error.cause.code === "ENAMETOOLONG");
    assert.deepEqual((await readdir(folder)).sort(), ["staged-file", "staged-long"]);
  });

  it("places a folder by a rename, never over what has its name, and gives the failure to place a file whose folder is gone", async t => {
    const folder = await folderAsync(t);
    await mkdir(path.join(folder, "aside"));
    await mkdir(path.join(folder, "taken"));
    await writeFile(path.join(folder, "staged"), "new");
    const aside = await lstat(path.join(folder, "aside"), { bigint: true });

    await assert.rejects(RestorePaths.placeAsync("taken", path.join(folder, "aside"), aside, path.join(folder, "taken"), taken, noRecordAsync, link, []),
      (error: unknown) => error instanceof RestorePathInTheWayException);
    await RestorePaths.placeAsync("dir", path.join(folder, "aside"), aside, path.join(folder, "dir"), taken, noRecordAsync, link, []);
    assert.deepEqual((await readdir(folder)).sort(), ["dir", "staged", "taken"]);

    await assert.rejects(RestorePaths.placeAsync("missing/a.txt", path.join(folder, "staged"), await lstat(path.join(folder, "staged"), { bigint: true }),
      path.join(folder, "missing", "a.txt"), taken, noRecordAsync, link, []), (error: unknown) => error instanceof RestoreStepFailedException && error.path === "missing/a.txt");
  });

  it("gives up at once on a failure no retry helps", async () => {
    let attempts = 0;
    await assert.rejects(RestorePaths.retryAsync("c.txt", async () => {
      attempts++;
      throw new FailureFixture("missing", "ENOENT");
    }), RestoreStepFailedException);
    assert.equal(attempts, 1);
  });

  it("lets a step's own failure, and a failure that isn't an error, through as they are", async () => {
    const own = new RestorePathInTheWayException("d.txt");

    await assert.rejects(RestorePaths.retryAsync("d.txt", async () => {
      throw own;
    }), (error: unknown) => error === own);
    await assert.rejects(RestorePaths.retryAsync("e.txt", async () => {
      throw "not an error";
    }), (error: unknown) => error === "not an error");
  });
});
