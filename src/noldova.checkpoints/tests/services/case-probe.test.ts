/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";

import { CaseProbe } from "../../src/services/case-probe.ts";
import { CaseFixture } from "../fixtures/case.fixture.ts";

const volumeIgnoresCase = await CaseFixture.ignoresCaseAsync();

describe("CaseProbe", { concurrency: true }, () => {
  const otherPlatform = volumeIgnoresCase ? "linux" : "win32";

  const folderAsync = async (t: TestContext): Promise<string> => {
    const folder = await realpath(await mkdtemp(path.join(tmpdir(), "probe-")));
    t.after(() => rm(folder, { recursive: true, force: true }));
    return folder;
  };

  const namesAsync = async (folder: string): Promise<Buffer[]> => (await readdir(folder, { encoding: "buffer" })).sort(Buffer.compare);

  it("finds the folder's own answer from a name with its letters' case swapped, whatever the system's usual one", async t => {
    const folder = await folderAsync(t);
    await writeFile(path.join(folder, "Readme.md"), "");

    assert.equal(await CaseProbe.ignoresCaseAsync(folder, await namesAsync(folder), otherPlatform), volumeIgnoresCase);
  });

  it("takes two files whose names differ only in letter case as case told apart", { skip: volumeIgnoresCase ? "the test folder's volume ignores letter case" : false }, async t => {
    const folder = await folderAsync(t);
    await writeFile(path.join(folder, "a.txt"), "a");
    await writeFile(path.join(folder, "A.TXT"), "b");

    assert.equal(await CaseProbe.ignoresCaseAsync(folder, await namesAsync(folder), "win32"), false);
  });

  it("passes over a name with no letters, a name left out as a .git, and a name that went away, then takes the system's usual answer", async t => {
    const folder = await folderAsync(t);
    await writeFile(path.join(folder, "123"), "");
    await mkdir(path.join(folder, ".git"));
    const names = [...await namesAsync(folder), Buffer.from("gone.txt")];

    assert.deepEqual(await Promise.all(["win32", "darwin", "linux"].map(t => CaseProbe.ignoresCaseAsync(folder, names, t))), [true, true, false]);
  });

  it("passes over a name the system won't read for that name alone, such as one too long for it, and takes the next", async t => {
    const folder = await folderAsync(t);
    await writeFile(path.join(folder, "Readme.md"), "");
    const names = [Buffer.from("a".repeat(300)), ...await namesAsync(folder)];

    assert.equal(await CaseProbe.ignoresCaseAsync(folder, names, otherPlatform), volumeIgnoresCase);
  });

  it("finds a folder's answer from a name that isn't ASCII, swapping only its ASCII letters", async t => {
    const folder = await folderAsync(t);
    await writeFile(path.join(folder, "Café"), "");

    assert.equal(await CaseProbe.ignoresCaseAsync(folder, await namesAsync(folder), otherPlatform), volumeIgnoresCase);
  });
});
