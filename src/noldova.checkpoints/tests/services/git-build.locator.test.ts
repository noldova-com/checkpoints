/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, type TestContext } from "node:test";
import { promisify } from "node:util";

import { JsonException, JsonReader } from "@noldova/context.json";
import { ModuleActivationException } from "@noldova/desktop.runtime";

import { GitManifestInvalidException, GitMissingException } from "../../src/api/index.ts";
import { Failures } from "../../src/services/failures.ts";
import { GitBuildLocator } from "../../src/services/git-build.locator.ts";
import { AccessFixture } from "../fixtures/access.fixture.ts";

const BUILDS_FILE: string = path.join(import.meta.dirname, "..", "..", "..", "noldova.checkpoints.git", "builds.json");

const PLANTED: string = "@noldova/checkpoints.git.test-x64";

const packageIn = (folder: string): string => path.join(folder, "node_modules", ...PLANTED.split("/"));

const plantAsync = async (t: TestContext, manifest: object): Promise<string> => {
  const folder = await realpath(await mkdtemp(path.join(tmpdir(), "git-build-locator-")));
  t.after(() => rm(folder, { recursive: true, force: true }));
  await mkdir(packageIn(folder), { recursive: true });
  await writeFile(path.join(packageIn(folder), "package.json"), JSON.stringify({ name: PLANTED, ...manifest }));
  return folder;
};

const installAsync = (t: TestContext, git: object): Promise<string> => plantAsync(t, { noldova: { git } });

describe("GitBuildLocator", { concurrency: true }, () => {
  it("finds the installed build for this system, by absolute paths into its package", async () => {
    const build = await new GitBuildLocator(import.meta.dirname).locateAsync(process.platform, process.arch);

    assert.ok(path.isAbsolute(build.program));
    assert.ok((await stat(build.program)).isFile());
    assert.ok((await stat(build.execPath)).isDirectory());
    assert.ok(build.path.length > 0);
    assert.ok(build.path.every(t => path.isAbsolute(t)));
  });

  it("runs the installed build for this system, which reports the Git version builds.json pins for it", async () => {
    const build = await new GitBuildLocator(import.meta.dirname).locateAsync(process.platform, process.arch);
    const pin = JsonReader.parse(await readFile(BUILDS_FILE, "utf8"), "Git builds").readObject("targets").readObject(`${process.platform}-${process.arch}`);
    const reported = pin.hasField("reportedVersion") ? pin.readString("reportedVersion") : pin.readString("gitVersion");

    const { stdout } = await promisify(execFile)(build.program, ["--version"]);

    assert.equal(stdout.trim(), `git version ${reported}`);
  });

  it("runs the program's copy in its exec path, where the build has one, so every Git the module starts is the same file", async () => {
    const build = await new GitBuildLocator(import.meta.dirname).locateAsync(process.platform, process.arch);

    assert.equal(path.dirname(build.program), process.platform === "win32" ? build.path[0] : build.execPath);
    assert.equal(path.basename(build.program), process.platform === "win32" ? "git.exe" : "git");
  });

  it("names every file of the installed build, and nothing else, in its package's noldovaDesktop.unpacked, by its path from the package with / between folders", async () => {
    const build = await new GitBuildLocator(import.meta.dirname).locateAsync(process.platform, process.arch);
    const manifestFile = createRequire(import.meta.filename).resolve(`@noldova/checkpoints.git.${process.platform}-${process.arch}/package.json`);
    const folder = path.dirname(manifestFile);
    const manifest = JsonReader.parse(await readFile(manifestFile, "utf8"), "Git package");
    const packaged = (file: string): string => path.relative(folder, file).split(path.sep).join("/");

    const unpacked = manifest.readObject("noldovaDesktop").readStringArray("unpacked");

    const files = (await readdir(path.join(folder, "git"), { recursive: true, withFileTypes: true })).filter(t => t.isFile()).map(t => packaged(path.join(t.parentPath, t.name)));
    assert.deepEqual(unpacked, files.sort());
    assert.ok(unpacked.includes(packaged(build.program)));
  });

  it("takes the program's copy in the exec path only where that is a file, and the build's paths in its package", async t => {
    const git = { execPath: "libexec", program: "bin/git", path: ["bin", "usr/bin"] };
    const missing = await installAsync(t, git);
    const missingFolder = packageIn(missing);
    const folder = await installAsync(t, git);
    const folderFolder = packageIn(folder);
    await mkdir(path.join(folderFolder, "libexec", "git"), { recursive: true });
    const file = await installAsync(t, git);
    const fileFolder = packageIn(file);
    await mkdir(path.join(fileFolder, "libexec"));
    await writeFile(path.join(fileFolder, "libexec", "git"), "");

    const builds = await Promise.all([missing, folder, file].map(u => new GitBuildLocator(u).locateAsync("test", "x64")));

    assert.deepEqual(builds.map(u => u.program), [path.join(missingFolder, "bin", "git"), path.join(folderFolder, "bin", "git"), path.join(fileFolder, "libexec", "git")]);
    assert.deepEqual([builds[0]?.execPath, builds[0]?.path], [path.join(missingFolder, "libexec"), [path.join(missingFolder, "bin"), path.join(missingFolder, "usr", "bin")]]);
  });

  it("gives Git the paths into its package's unpacked copy when the package is inside app.asar, as a packaged app holds it", async t => {
    const root = await realpath(await mkdtemp(path.join(tmpdir(), "git-build-locator-")));
    t.after(() => rm(root, { recursive: true, force: true }));
    const packed = path.join(root, "resources", "app.asar");
    const unpacked = packageIn(path.join(root, "resources", "app.asar.unpacked"));
    await mkdir(packageIn(packed), { recursive: true });
    await writeFile(path.join(packageIn(packed), "package.json"), JSON.stringify({ name: PLANTED, noldova: { git: { execPath: "libexec", program: "bin/git", path: ["bin"] } } }));
    await mkdir(path.join(unpacked, "libexec"), { recursive: true });
    await writeFile(path.join(unpacked, "libexec", "git"), "");

    const build = await new GitBuildLocator(packed).locateAsync("test", "x64");

    assert.deepEqual([build.program, build.execPath, build.path], [path.join(unpacked, "libexec", "git"), path.join(unpacked, "libexec"), [path.join(unpacked, "bin")]]);
  });

  it("refuses to start the module, naming the manifest in the cause, when an installed build's manifest doesn't name the build's parts", async t => {
    const start = await installAsync(t, { execPath: "libexec", program: "bin/git" });
    const manifestFile = path.join(packageIn(start), "package.json");

    await assert.rejects(new GitBuildLocator(start).locateAsync("test", "x64"), (error: unknown) => error instanceof ModuleActivationException
      && error.message === "The Git build it runs on this system can't be read, so it can't keep checkpoints."
      && error.cause instanceof GitManifestInvalidException && error.cause.manifestFile === manifestFile
      && error.cause.cause instanceof JsonException && error.cause.cause.message === "GitPackage.noldova.git.path: The field is required.");
  });

  it("refuses a manifest whose build paths aren't all text", async t => {
    const start = await installAsync(t, { execPath: "libexec", program: "bin/git", path: ["bin", 3] });

    await assert.rejects(new GitBuildLocator(start).locateAsync("test", "x64"), (error: unknown) => error instanceof ModuleActivationException
      && error.cause instanceof GitManifestInvalidException && error.cause.cause instanceof JsonException
      && error.cause.cause.message === "GitPackage.noldova.git.path.1: Expected a string.");
  });

  it("refuses to start the module, naming the manifest it asked for in the cause, when an installed build's manifest isn't JSON", async t => {
    const start = await plantAsync(t, {});
    await writeFile(path.join(packageIn(start), "package.json"), "{ not JSON");

    await assert.rejects(new GitBuildLocator(start).locateAsync("test", "x64"), (error: unknown) => error instanceof ModuleActivationException
      && error.message === "The Git build it runs on this system can't be read, so it can't keep checkpoints."
      && error.cause instanceof GitManifestInvalidException && error.cause.manifestFile === `${PLANTED}/package.json`
      && error.cause.cause instanceof Error && "code" in error.cause.cause && error.cause.cause.code === "ERR_INVALID_PACKAGE_CONFIG");
  });

  it("refuses to start the module, naming the manifest in the cause, when the system won't let Node read an installed build's manifest as it looks for the build", { skip: AccessFixture.isRoot ? "root reads past any file mode" : false }, async t => {
    const start = await installAsync(t, { execPath: "libexec", program: "bin/git", path: ["bin"] });

    await AccessFixture.whileDeniedAsync(path.join(packageIn(start), "package.json"), async () => {
      const error = await new GitBuildLocator(start).locateAsync("test", "x64").then(() => null, (t: unknown) => t);
      assert.ok(error instanceof ModuleActivationException && error.cause instanceof GitManifestInvalidException && error.cause.cause instanceof Error);
      assert.deepEqual([error.message, error.cause.manifestFile, Failures.codeOf(error.cause.cause)],
        ["The Git build it runs on this system can't be read, so it can't keep checkpoints.", "@noldova/checkpoints.git.test-x64/package.json", "ERR_INVALID_PACKAGE_CONFIG"]);
    });
  });

  it("refuses to start the module, naming the package in the cause, when no build for the target is installed", async () => {
    await assert.rejects(new GitBuildLocator(import.meta.dirname).locateAsync("plan9", "mips"), (error: unknown) => error instanceof ModuleActivationException
      && error.message === "The Git build it runs on this system isn't installed, so it can't keep checkpoints."
      && error.cause instanceof GitMissingException && error.cause.packageName === "@noldova/checkpoints.git.plan9-mips" && error.cause.cause instanceof Error);
  });

  it("refuses to start the module, naming the package in the cause, when the installed build's package doesn't export its manifest", async t => {
    const start = await plantAsync(t, { exports: { ".": "./index.js" }, noldova: { git: { execPath: "libexec", program: "bin/git", path: ["bin"] } } });

    await assert.rejects(new GitBuildLocator(start).locateAsync("test", "x64"), (error: unknown) => error instanceof ModuleActivationException
      && error.message === "The Git build it runs on this system isn't installed, so it can't keep checkpoints."
      && error.cause instanceof GitMissingException && error.cause.packageName === PLANTED && error.cause.cause instanceof Error);
  });

  it("finds the build from the folder it's given, not from its own", async t => {
    const start = await installAsync(t, { execPath: "libexec", program: "bin/git", path: ["bin"] });

    const build = await new GitBuildLocator(start).locateAsync("test", "x64");

    assert.equal(build.program, path.join(packageIn(start), "bin", "git"));
    await assert.rejects(new GitBuildLocator(import.meta.dirname).locateAsync("test", "x64"), (error: unknown) => error instanceof ModuleActivationException
      && error.cause instanceof GitMissingException && error.cause.packageName === PLANTED);
  });
});
