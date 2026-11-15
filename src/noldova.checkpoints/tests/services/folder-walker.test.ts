/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { constants, type BigIntStats } from "node:fs";
import { chmod, link, lstat, mkdir, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import { CaptureMode, UnreadPath, UnreadReason } from "@noldova/checkpoints.protocol";

import { EntryKind } from "../../src/models/entry-kind.ts";
import { LinkKind } from "../../src/models/link-kind.ts";
import { LinkRecord } from "../../src/models/link-record.ts";
import { FolderWalker } from "../../src/services/folder-walker.ts";
import { AccessFixture } from "../fixtures/access.fixture.ts";
import { CancelFixture } from "../fixtures/cancel.fixture.ts";
import { CaseFixture } from "../fixtures/case.fixture.ts";
import { LinkFixture } from "../fixtures/link.fixture.ts";

describe("FolderWalker", { concurrency: true }, () => {
  const uncancelled: AbortSignal = new AbortController().signal;

  const isWindows = process.platform === "win32";

  const folderAsync = async (t: TestContext): Promise<string> => {
    const folder = await realpath(await mkdtemp(path.join(tmpdir(), "walker-")));
    t.after(() => rm(folder, { recursive: true, force: true }));
    return folder;
  };

  const writeAsync = async (folder: string, relativePath: string, content: string = ""): Promise<string> => {
    const location = path.join(folder, ...relativePath.split("/"));
    await mkdir(path.dirname(location), { recursive: true });
    await writeFile(location, content);
    return location;
  };

  it("finds every file and folder by \"/\" paths in the names' byte order", async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, "b.txt", "b");
    await writeAsync(folder, "a.txt", "a");
    await writeAsync(folder, "Z.txt", "z");
    await writeAsync(folder, "src/lib/x.ts", "x");

    const result = await new FolderWalker(process.platform).walkAsync(folder, CaptureMode.EveryFile, uncancelled);

    assert.deepEqual(result.entries.map(t => t.path), ["Z.txt", "a.txt", "b.txt", "src/lib/x.ts"]);
    assert.deepEqual(result.entries.map(t => t.kind), [EntryKind.File, EntryKind.File, EntryKind.File, EntryKind.File]);
    assert.equal(result.entries[3]?.location, path.join(folder, "src", "lib", "x.ts"));
    assert.equal(result.entries[1]?.size, 1);
    assert.deepEqual([result.emptyFolders, result.links, result.unreadPaths], [[], [], []]);
  });

  it("stops before its next entry once its signal aborts, inside a folder too, with the signal's reason", async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, "a.txt", "a");
    await writeAsync(folder, "b.txt", "b");
    await writeAsync(folder, "src/x.ts", "x");
    await writeAsync(folder, "src/y.ts", "y");
    const cancel = new CancelFixture(t, 4);

    await assert.rejects(new FolderWalker(process.platform).walkAsync(folder, CaptureMode.EveryFile, cancel.signal), cancel.reason);

    assert.equal(cancel.checks, 4);
  });

  it("never enters a .git, the folder's own or a nested repository's, nor a .git file, and keeps the rest of a nested repository", async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, ".git/HEAD", "ref: refs/heads/main\n");
    await writeAsync(folder, "vendor/lib/.git/HEAD", "ref: refs/heads/main\n");
    await writeAsync(folder, "vendor/lib/x.ts", "x");
    await writeAsync(folder, "modules/sub/.git", "gitdir: ../../.git/modules/sub\n");
    await writeAsync(folder, "only/.git/config", "");
    await writeAsync(folder, ".gitignore", "");

    const result = await new FolderWalker(process.platform).walkAsync(folder, CaptureMode.EveryFile, uncancelled);

    assert.deepEqual(result.entries.map(t => t.path), [".gitignore", "vendor/lib/x.ts"]);
    assert.deepEqual(result.emptyFolders, ["modules/sub", "only"]);
    assert.deepEqual(result.unreadPaths, []);
  });

  it("records each .git, and each folder that holds one and each folder above that, but not the folder walked, in either mode", async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, ".git/HEAD", "ref: refs/heads/main\n");
    await writeAsync(folder, "vendor/lib/.git/HEAD", "ref: refs/heads/main\n");
    await writeAsync(folder, "vendor/lib/deep/.git", "gitdir: elsewhere\n");
    await writeAsync(folder, "modules/sub/.git", "gitdir: ../../.git/modules/sub\n");
    await writeAsync(folder, "src/a.ts", "a");

    for (const mode of [CaptureMode.EveryFile, CaptureMode.IgnoreFiles]) {
      const result = await new FolderWalker(process.platform).walkAsync(folder, mode, uncancelled);

      assert.deepEqual(result.repositoryPaths, [".git", "modules/sub/.git", "vendor/lib/.git", "vendor/lib/deep/.git"]);
      assert.deepEqual([...result.repositoryFolders].sort(), ["modules", "modules/sub", "vendor", "vendor/lib", "vendor/lib/deep"]);
    }
  });

  it("leaves out every name Git treats as .git that the system can hold: another letter case, the short name, an HFS+ ignorable", async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, ".GIT/HEAD", "ref: refs/heads/main\n");
    await writeAsync(folder, "a/.Git", "gitdir: elsewhere\n");
    await writeAsync(folder, "a/.git~", "kept");
    await writeAsync(folder, "b/GIT~1/hooks/post-checkout", "");
    await writeAsync(folder, "c/.g\u200Cit", "gitdir: elsewhere\n");

    const result = await new FolderWalker(process.platform).walkAsync(folder, CaptureMode.EveryFile, uncancelled);

    assert.deepEqual(result.entries.map(t => t.path), ["a/.git~"]);
    assert.deepEqual(result.emptyFolders, ["b", "c"]);
  });

  it("leaves out and records another name with a .git's file id, such as a hard link to a .git file", async t => {
    const folder = await folderAsync(t);
    const pointer = await writeAsync(folder, "sub/.git", "gitdir: ../.git/modules/sub\n");
    await link(pointer, path.join(folder, "sub", "alias"));
    await writeAsync(folder, "sub/x.ts", "x");

    const result = await new FolderWalker(process.platform).walkAsync(folder, CaptureMode.EveryFile, uncancelled);

    assert.deepEqual(result.entries.map(t => t.path), ["sub/x.ts"]);
    assert.deepEqual(result.repositoryPaths, ["sub/.git", "sub/alias"]);
  });

  it("never reads inside a .git, even one the system won't let it open", { skip: AccessFixture.isRoot ? "root reads past any file mode" : false }, async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, ".git/HEAD", "ref: refs/heads/main\n");
    await writeAsync(folder, "a.txt", "a");

    await AccessFixture.whileDeniedAsync(path.join(folder, ".git"), async () => {
      const result = await new FolderWalker(process.platform).walkAsync(folder, CaptureMode.EveryFile, uncancelled);

      assert.deepEqual([result.entries.map(t => t.path), result.unreadPaths], [["a.txt"], []]);
    });
  });

  it("lists each folder that holds nothing kept, but not the folder walked, nor a folder holding only empty folders", async t => {
    const folder = await folderAsync(t);
    await mkdir(path.join(folder, "logs", "old"), { recursive: true });
    await mkdir(path.join(folder, "cache"));

    const result = await new FolderWalker(process.platform).walkAsync(folder, CaptureMode.EveryFile, uncancelled);

    assert.deepEqual(result.emptyFolders, ["cache", "logs/old"]);
    assert.deepEqual(result.entries, []);
    assert.deepEqual((await new FolderWalker(process.platform).walkAsync(path.join(folder, "cache"), CaptureMode.EveryFile, uncancelled)).emptyFolders, []);
  });

  it("keeps a link as a link and never follows it", async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, "real/inside.txt", "inside");
    await symlink(path.join(folder, "real"), path.join(folder, "out"), "junction");

    const result = await new FolderWalker("linux").walkAsync(folder, CaptureMode.EveryFile, uncancelled);

    assert.deepEqual(result.entries.map(t => [t.path, t.kind]), [["out", EntryKind.Link], ["real/inside.txt", EntryKind.File]]);
    assert.deepEqual(result.links, []);
  });

  it("records on Windows whether each link points at a folder, taking one whose target is missing or a loop of links as a file link", async t => {
    const folder = await folderAsync(t);
    await mkdir(path.join(folder, "real"));
    await mkdir(path.join(folder, "gone"));
    await symlink(path.join(folder, "real"), path.join(folder, "folder-link"), "junction");
    await symlink(path.join(folder, "gone"), path.join(folder, "missing-link"), "junction");
    await rm(path.join(folder, "gone"), { recursive: true });
    await symlink(path.join(folder, "loop-b"), path.join(folder, "loop-a"), "junction");
    await symlink(path.join(folder, "loop-a"), path.join(folder, "loop-b"), "junction");

    const result = await new FolderWalker("win32").walkAsync(folder, CaptureMode.EveryFile, uncancelled);

    assert.deepEqual(result.links, [new LinkRecord("folder-link", LinkKind.Folder), new LinkRecord("loop-a", LinkKind.File), new LinkRecord("loop-b", LinkKind.File),
      new LinkRecord("missing-link", LinkKind.File)]);
    assert.deepEqual(result.emptyFolders, ["real"]);
  });

  it("records on Windows a link to a file that is there as a file link", async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, "real.txt", "real");
    await LinkFixture.symlinkAsync(path.join(folder, "real.txt"), path.join(folder, "file-link"), "file");

    const result = await new FolderWalker("win32").walkAsync(folder, CaptureMode.EveryFile, uncancelled);

    assert.deepEqual(result.entries.map(t => [t.path, t.kind]), [["file-link", EntryKind.Link], ["real.txt", EntryKind.File]]);
    assert.deepEqual(result.links, [new LinkRecord("file-link", LinkKind.File)]);
  });

  it("lists a link on Windows whose target the system won't let it look at as Denied, with no entry or link record", { skip: AccessFixture.isRoot ? "root reads past any file mode" : false }, async t => {
    const folder = await folderAsync(t);
    await mkdir(path.join(folder, "closed", "target"), { recursive: true });
    await symlink(path.join(folder, "closed", "target"), path.join(folder, "out"), "junction");

    await AccessFixture.whileHiddenAsync(path.join(folder, "closed", "target"), async () => {
      const result = await new FolderWalker("win32").walkAsync(folder, CaptureMode.EveryFile, uncancelled);

      assert.deepEqual(result.unreadPaths, [new UnreadPath(isWindows ? "closed/target" : "closed", UnreadReason.Denied, null), new UnreadPath("out", UnreadReason.Denied, null)]);
      assert.deepEqual(result.entries, []);
      assert.deepEqual(result.links, []);
    });
  });

  it("keeps a file its owner may run as executable", { skip: isWindows ? "Windows keeps no executable bit" : false }, async t => {
    const folder = await folderAsync(t);
    await chmod(await writeAsync(folder, "run.sh", "#!/bin/sh\n"), 0o755);
    await writeAsync(folder, "read.me", "");

    const result = await new FolderWalker(process.platform).walkAsync(folder, CaptureMode.EveryFile, uncancelled);

    assert.deepEqual(result.entries.map(t => [t.path, t.kind]), [["read.me", EntryKind.File], ["run.sh", EntryKind.Executable]]);
  });

  it("leaves out a socket, and lists the folder that held only it as empty", { skip: isWindows ? "Windows has no socket in a folder" : false }, async t => {
    const folder = await folderAsync(t);
    await mkdir(path.join(folder, "run"));
    const server = createServer();
    await new Promise<void>(resolve => server.listen(path.join(folder, "run", "s.sock"), resolve));
    t.after(() => new Promise<void>(resolve => server.close(() => resolve())));

    const result = await new FolderWalker(process.platform).walkAsync(folder, CaptureMode.EveryFile, uncancelled);

    assert.deepEqual(result.entries, []);
    assert.deepEqual(result.emptyFolders, ["run"]);
  });

  it("lists a name that isn't valid Unicode as InvalidName, and the folder holding it isn't empty", { skip: process.platform !== "linux" ? "only Linux allows a name that isn't valid Unicode" : false }, async t => {
    const folder = await folderAsync(t);
    await mkdir(path.join(folder, "odd"));
    await writeFile(Buffer.concat([Buffer.from(path.join(folder, "odd") + path.sep), Buffer.from([0x61, 0xff])]), "");

    const result = await new FolderWalker(process.platform).walkAsync(folder, CaptureMode.EveryFile, uncancelled);

    assert.deepEqual(result.unreadPaths, [new UnreadPath("odd/a�", UnreadReason.InvalidName, null)]);
    assert.deepEqual(result.emptyFolders, []);
  });

  it("lists a folder the system won't let it read as Denied, and goes on", { skip: AccessFixture.isRoot ? "root reads past any file mode" : false }, async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, "closed/secret.txt", "s");
    await writeAsync(folder, "open.txt", "o");

    await AccessFixture.whileDeniedAsync(path.join(folder, "closed"), async () => {
      const result = await new FolderWalker(process.platform).walkAsync(folder, CaptureMode.EveryFile, uncancelled);

      assert.deepEqual(result.unreadPaths, [new UnreadPath("closed", UnreadReason.Denied, null)]);
      assert.deepEqual(result.entries.map(t => t.path), ["open.txt"]);
      assert.deepEqual(result.emptyFolders, []);
    });
  });

  it("keeps in every-file mode what the .gitignore files ignore, and follows no rules", async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, ".gitignore", "*.log\n");
    await writeAsync(folder, "a.log", "a");

    const result = await new FolderWalker(process.platform).walkAsync(folder, CaptureMode.EveryFile, uncancelled);

    assert.deepEqual(result.entries.map(t => t.path), [".gitignore", "a.log"]);
    assert.equal(result.rules, null);
  });

  it("follows the .gitignore files at every depth as Git matches them: negation, an anchoring \"/\", a trailing \"/\", \"**\" and escapes", async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, ".gitignore", "# a comment\n*.log\n!keep.log\n/build\ncache/\ndocs/**/*.tmp\n\\#notes\n");
    await writeAsync(folder, "src/.gitignore", "!a.log\n");
    for (const file of ["a.log", "keep.log", "build/x", "src/build/y", "cache/z", "src/cache/z", "lib/cache", "docs/a/b/c.tmp", "docs/c.tmp", "#notes", "src/a.log", "src/b.log"])
      await writeAsync(folder, file, "x");

    const result = await new FolderWalker(process.platform).walkAsync(folder, CaptureMode.IgnoreFiles, uncancelled);

    assert.deepEqual(result.entries.map(t => t.path), [".gitignore", "keep.log", "lib/cache", "src/.gitignore", "src/a.log", "src/build/y"]);
    assert.deepEqual(result.emptyFolders, ["docs/a/b"]);
    assert.deepEqual(result.rules?.files.map(t => [t.folderPath, t.content.toString()]), [["", "# a comment\n*.log\n!keep.log\n/build\ncache/\ndocs/**/*.tmp\n\\#notes\n"], ["src", "!a.log\n"]]);
    assert.deepEqual(result.rules?.repositoryFolders, []);
  });

  it("never enters an ignored folder, so a file included again under it stays out and a .gitignore in it is never read, as in Git", async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, ".gitignore", "out/\n!out/keep.txt\nlogs/*\n!logs/keep.txt\n");
    await writeAsync(folder, "out/keep.txt", "k");
    await writeAsync(folder, "out/.gitignore", "!*\n");
    await writeAsync(folder, "logs/keep.txt", "k");
    await writeAsync(folder, "logs/drop.txt", "d");

    const result = await new FolderWalker(process.platform).walkAsync(folder, CaptureMode.IgnoreFiles, uncancelled);

    assert.deepEqual(result.entries.map(t => t.path), [".gitignore", "logs/keep.txt"]);
    assert.deepEqual(result.rules?.files.map(t => t.folderPath), [""]);
  });

  it("records each path the rules ignore, the topmost only, and none in every-file mode", async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, ".gitignore", "out/\n*.log\n");
    await writeAsync(folder, "out/a/b.txt", "b");
    await writeAsync(folder, "src/a.log", "a");
    await writeAsync(folder, "src/a.ts", "a");

    const ignoring = await new FolderWalker(process.platform).walkAsync(folder, CaptureMode.IgnoreFiles, uncancelled);
    const everyFile = await new FolderWalker(process.platform).walkAsync(folder, CaptureMode.EveryFile, uncancelled);

    assert.deepEqual(ignoring.ignoredPaths, ["out", "src/a.log"]);
    assert.deepEqual(everyFile.ignoredPaths, []);
  });

  it("lets the outer rules decide a nested repository's folder, and only its own .gitignore files what is in it", async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, ".gitignore", "*.log\nvendor/skip/\n");
    await writeAsync(folder, "vendor/lib/.git/HEAD", "ref: refs/heads/main\n");
    await writeAsync(folder, "vendor/lib/.gitignore", "*.tmp\n");
    await writeAsync(folder, "vendor/lib/a.log", "a");
    await writeAsync(folder, "vendor/lib/a.tmp", "a");
    await writeAsync(folder, "vendor/skip/.git/HEAD", "ref: refs/heads/main\n");
    await writeAsync(folder, "vendor/skip/x", "x");
    await writeAsync(folder, "vendor/a.log", "a");

    const result = await new FolderWalker(process.platform).walkAsync(folder, CaptureMode.IgnoreFiles, uncancelled);

    assert.deepEqual(result.entries.map(t => t.path), [".gitignore", "vendor/lib/.gitignore", "vendor/lib/a.log"]);
    assert.deepEqual(result.rules?.repositoryFolders, ["vendor/lib"]);
    assert.deepEqual(result.rules?.files.map(t => t.folderPath), ["", "vendor/lib"]);
  });

  it("never keeps a .git, whatever the rules include again", async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, ".gitignore", "!.git\n!.git/**\n");
    await writeAsync(folder, ".git/HEAD", "ref: refs/heads/main\n");

    const result = await new FolderWalker(process.platform).walkAsync(folder, CaptureMode.IgnoreFiles, uncancelled);

    assert.deepEqual(result.entries.map(t => t.path), [".gitignore"]);
  });

  it("takes no rules from a .gitignore that is a folder, and keeps it as a folder", async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, ".gitignore/x", "*.log\n");
    await writeAsync(folder, "a.log", "a");

    const result = await new FolderWalker(process.platform).walkAsync(folder, CaptureMode.IgnoreFiles, uncancelled);

    assert.deepEqual(result.entries.map(t => t.path), [".gitignore/x", "a.log"]);
    assert.deepEqual(result.rules?.files, []);
  });

  it("takes no rules from a .gitignore the system won't let it read, and keeps it among the entries", { skip: AccessFixture.isRoot ? "root reads past any file mode" : false }, async t => {
    const folder = await folderAsync(t);
    const ignoreFile = await writeAsync(folder, ".gitignore", "*.log\n");
    await writeAsync(folder, "a.log", "a");

    await AccessFixture.whileDeniedAsync(ignoreFile, async () => {
      const result = await new FolderWalker(process.platform).walkAsync(folder, CaptureMode.IgnoreFiles, uncancelled);

      assert.deepEqual(result.entries.map(t => t.path), [".gitignore", "a.log"]);
      assert.deepEqual(result.rules?.files, []);
    });
  });

  it("matches letter case as the folder's file system does, and records which", async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, ".gitignore", "*.LOG\n");
    await writeAsync(folder, "a.log", "a");
    const volumeIgnoresCase = await CaseFixture.ignoresCaseAsync();

    const result = await new FolderWalker(volumeIgnoresCase ? "linux" : "win32").walkAsync(folder, CaptureMode.IgnoreFiles, uncancelled);

    assert.equal(result.rules?.ignoresCase, volumeIgnoresCase);
    assert.deepEqual(result.entries.map(t => t.path), volumeIgnoresCase ? [".gitignore"] : [".gitignore", "a.log"]);
  });

  it("opens a folder's .gitignore by its name, as Git does, so a file system that ignores letter case finds it under another case", async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, ".GITIGNORE", "*.log\n");
    await writeAsync(folder, "a.log", "a");
    const volumeIgnoresCase = await CaseFixture.ignoresCaseAsync();

    const result = await new FolderWalker(process.platform).walkAsync(folder, CaptureMode.IgnoreFiles, uncancelled);

    assert.deepEqual(result.entries.map(t => t.path), volumeIgnoresCase ? [".GITIGNORE"] : [".GITIGNORE", "a.log"]);
    assert.deepEqual(result.rules?.files.map(t => t.folderPath), volumeIgnoresCase ? [""] : []);
  });

  it("matches names that aren't ASCII by their bytes, so \"?\" never matches a character of two bytes", async t => {
    const folder = await folderAsync(t);
    await writeAsync(folder, ".gitignore", "données/\ncaf?.txt\n日本*\n");
    for (const file of ["données/x.txt", "cafe.txt", "café.txt", "日本語.md", "😀.txt"])
      await writeAsync(folder, file, "x");

    const result = await new FolderWalker(process.platform).walkAsync(folder, CaptureMode.IgnoreFiles, uncancelled);

    assert.deepEqual(result.entries.map(t => t.path).sort(), [".gitignore", "café.txt", "😀.txt"].sort());
  });
});

describe("FolderWalker, alone", () => {
  it("leaves out an item that is no file, folder or link, as a socket is, and lists the folder that held only it as empty", async t => {
    const folder = await realpath(await mkdtemp(path.join(tmpdir(), "walker-")));
    t.after(() => rm(folder, { recursive: true, force: true }));
    await mkdir(path.join(folder, "run"));
    const location = path.join(folder, "run", "s.sock");
    await writeFile(location, "");
    const stats = await lstat(location, { bigint: true });
    const prototype: unknown = stats.constructor.prototype;
    const isTelling = (value: unknown): value is Pick<BigIntStats, "isFile"> =>
      typeof value === "object" && value !== null && "isFile" in value && typeof value.isFile === "function";
    assert.ok(isTelling(prototype));
    t.mock.method(prototype, "isFile", function (this: BigIntStats): boolean {
      return this.ino !== stats.ino && (this.mode & BigInt(constants.S_IFMT)) === BigInt(constants.S_IFREG);
    });

    const result = await new FolderWalker(process.platform).walkAsync(folder, CaptureMode.EveryFile, new AbortController().signal);

    assert.deepEqual(result.entries, []);
    assert.deepEqual(result.emptyFolders, ["run"]);
  });
});
