/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, open, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import { IgnoreFileReader } from "../../src/services/ignore-file.reader.ts";
import { AccessFixture } from "../fixtures/access.fixture.ts";
import { LinkFixture } from "../fixtures/link.fixture.ts";

const folderAsync = async (t: TestContext): Promise<string> => {
  const folder = await realpath(await mkdtemp(path.join(tmpdir(), "ignore-")));
  t.after(() => rm(folder, { recursive: true, force: true }));
  return folder;
};

const withoutLinks = await LinkFixture.withoutLinksAsync();

describe("IgnoreFileReader", { concurrency: true }, () => {
  it("reads a .gitignore's bytes", async t => {
    const location = path.join(await folderAsync(t), ".gitignore");
    await writeFile(location, Buffer.from([0x2a, 0x0a, 0xff]));

    assert.deepEqual(await IgnoreFileReader.readAsync(location), Buffer.from([0x2a, 0x0a, 0xff]));
  });

  it("gives no content for a .gitignore that's missing, a folder or a link", async t => {
    const folder = await folderAsync(t);
    const isWindows = process.platform === "win32";
    await mkdir(path.join(folder, "folder", ".gitignore"), { recursive: true });
    await mkdir(path.join(folder, "target"));
    await writeFile(path.join(folder, "target.txt"), "*\n");
    await mkdir(path.join(folder, "link"));
    await symlink(path.join(folder, isWindows ? "target" : "target.txt"), path.join(folder, "link", ".gitignore"), isWindows ? "junction" : "file");

    assert.deepEqual(await Promise.all(["missing", "folder", "link"].map(t => IgnoreFileReader.readAsync(path.join(folder, t, ".gitignore")))),
      [null, null, null]);
  });

  it("gives no content for a .gitignore that links to a file", { skip: withoutLinks }, async t => {
    const folder = await folderAsync(t);
    await writeFile(path.join(folder, "target.txt"), "*\n");
    await LinkFixture.symlinkAsync(path.join(folder, "target.txt"), path.join(folder, ".gitignore"), "file");

    assert.equal(await IgnoreFileReader.readAsync(path.join(folder, ".gitignore")), null);
  });

  it("gives no content for a .gitignore that is a pipe, without waiting on it", { skip: process.platform === "win32" ? "Windows has no named pipe in a folder" : false }, async t => {
    const location = path.join(await folderAsync(t), ".gitignore");
    execFileSync("mkfifo", [location]);

    assert.equal(await IgnoreFileReader.readAsync(location), null);
  });

  it("gives no content for a .gitignore that is a socket", { skip: process.platform === "win32" ? "Windows has no socket in a folder" : false }, async t => {
    const location = path.join(await folderAsync(t), ".gitignore");
    const server = createServer();
    await once(server.listen(location), "listening");
    t.after(() => new Promise<void>(resolve => server.close(() => resolve())));

    assert.equal(await IgnoreFileReader.readAsync(location), null);
  });

  it("gives no content for a .gitignore of 100 MiB or more, which Git refuses, and reads one just under", async t => {
    const folder = await folderAsync(t);
    const sizedAsync = async (name: string, size: number): Promise<string> => {
      const location = path.join(folder, name, ".gitignore");
      await mkdir(path.dirname(location));
      const handle = await open(location, "w");
      await handle.truncate(size);
      await handle.close();
      return location;
    };

    assert.equal((await IgnoreFileReader.readAsync(await sizedAsync("under", 100 * 1024 * 1024 - 1)))?.length, 100 * 1024 * 1024 - 1);
    assert.equal(await IgnoreFileReader.readAsync(await sizedAsync("at", 100 * 1024 * 1024)), null);
    assert.equal(await IgnoreFileReader.readAsync(await sizedAsync("over", 100 * 1024 * 1024 + 1)), null);
  });

  it("gives no content for a .gitignore the system won't let it read", { skip: AccessFixture.isRoot ? "root reads past any file mode" : false }, async t => {
    const location = path.join(await folderAsync(t), ".gitignore");
    await writeFile(location, "*\n");

    await AccessFixture.whileDeniedAsync(location, async () => {
      assert.equal(await IgnoreFileReader.readAsync(location), null);
    });
  });
});
