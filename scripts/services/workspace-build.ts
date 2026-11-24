/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { existsSync } from "node:fs";
import { readFile, rm, stat } from "node:fs/promises";
import path from "node:path";

import "@noldova/context.core";

import { PackageException } from "../exceptions/package.exception.ts";
import { ReleaseArchive } from "../models/release-archive.ts";
import { RootManifest } from "../models/root-manifest.ts";
import type { WorkspacePart } from "../models/workspace-part.ts";
import { Resources } from "../resources.ts";
import { ArchiveCheck } from "./archive-check.ts";
import { ArchiveReader } from "./archive-reader.ts";
import { GitPackageBuild } from "./git-package-build.ts";
import type { NpmCommand } from "./npm-command.ts";
import type { PackagePacker } from "./package-packer.ts";
import { WorkspaceLayout } from "./workspace-layout.ts";

export class WorkspaceBuild {
  private static readonly INSTALL_ARGUMENTS: readonly string[] = [
    Resources.installCommand,
    Resources.noSaveOption,
    Resources.ignoreScriptsOption,
    Resources.noAuditOption,
    Resources.noFundOption,
    Resources.errorLogLevelOption
  ];
  private static readonly MANIFEST_ENTRY: string = Resources.formatArchiveEntry(Resources.manifestFile);

  private readonly checkReleaseAsync: (version: string, commit: string) => Promise<number>;
  private readonly environment: NodeJS.ProcessEnv;
  private readonly host: string;
  private readonly layout: WorkspaceLayout;
  private readonly npm: NpmCommand;
  private readonly packer: PackagePacker;
  private readonly readCommitAsync: () => Promise<string | null>;
  private readonly report: (line: string) => void;
  private readonly root: string;

  public constructor(root: string, layout: WorkspaceLayout, packer: PackagePacker, npm: NpmCommand, environment: NodeJS.ProcessEnv, host: string,
    report: (line: string) => void, checkReleaseAsync: (version: string, commit: string) => Promise<number>, readCommitAsync: () => Promise<string | null>) {
    this.checkReleaseAsync = checkReleaseAsync;
    this.environment = environment;
    this.host = host;
    this.layout = layout;
    this.npm = npm;
    this.packer = packer;
    this.readCommitAsync = readCommitAsync;
    this.report = report;
    this.root = root;
  }

  public async runAsync(): Promise<number> {
    await rm(path.join(this.root, Resources.archivesFolder), { recursive: true, force: true });
    for (const part of await this.layout.readReleasePartsAsync())
      await rm(path.join(this.root, Resources.nodeModulesFolder, ...part.name.split(Resources.scopeSeparator)), { recursive: true, force: true });
    const manifest = RootManifest.parse(await readFile(path.join(this.root, Resources.manifestFile), Resources.utf8Encoding));
    const version = manifest.productVersion;
    const released = await this.readReleasedVersionAsync();
    if (released !== version) {
      this.report(Resources.formatVersionsDiffer(released, version));
      return 1;
    }
    const hostGit = WorkspaceLayout.gitPackageName(this.host);
    const isRelease = !Object.isUndefined(this.environment[Resources.releaseVersionVariable]);
    const commit = isRelease ? this.environment[Resources.releaseCommitVariable] ?? "" : await this.readCommitAsync();
    if (!Object.isNull(commit) && !Resources.commitPattern.test(commit)) {
      this.report(Resources.formatReleaseCommitUnrecorded(commit));
      return 1;
    }
    const gitParts = await this.layout.readGitPartsAsync();
    if (!gitParts.some(t => t.name === hostGit)) {
      this.report(Resources.formatHostBuildMissing(this.host));
      return 1;
    }

    const kept = await this.layout.readInstalledPinsAsync(manifest.pins);
    const gitBuild = new GitPackageBuild(this.root, await this.layout.readBuildsAsync(), this.npm, this.report);
    const packed: ReleaseArchive[] = [];
    for (const part of gitParts)
      try {
        await gitBuild.packAsync(part, version, commit);
        packed.push(new ReleaseArchive(part, this.archiveOf(part, version)));
      }
      catch (error) {
        if (!(error instanceof PackageException))
          throw error;
        this.report(error.message);
        return 1;
      }

    for (const part of await this.layout.readPartsAsync()) {
      const installed = packed.filter(t => !gitParts.includes(t.part) || t.part.name === hostGit).map(t => t.filePath);
      const result = await this.npm.runAsync([...WorkspaceBuild.INSTALL_ARGUMENTS, ...installed, ...kept], this.root);
      if (!result.isSuccessful) {
        this.report(Resources.formatInstallFailed(part.name, result.exitCode, result.text));
        return 1;
      }
      if (await this.packer.runAsync([part], commit) !== 0)
        return 1;

      packed.push(new ReleaseArchive(part, this.archiveOf(part, version)));
    }

    const findings: string[] = [];
    const reader = new ArchiveReader();
    for (const archive of packed) {
      const archiveName = path.basename(archive.filePath);
      const tooLarge = ArchiveCheck.checkSize(archiveName, (await stat(archive.filePath)).size);
      if (!Object.isNull(tooLarge)) {
        findings.push(tooLarge);
        continue;
      }
      const entries = await reader.readAsync(archive.filePath);
      const packedManifest: unknown = JSON.parse(entries.get(WorkspaceBuild.MANIFEST_ENTRY)?.toString(Resources.utf8Encoding) ?? Resources.jsonNull);
      if (!Object.isObject(packedManifest) || Array.isArray(packedManifest))
        findings.push(Resources.formatArchiveManifestMissing(archiveName));
      else
        findings.push(...ArchiveCheck.check(archiveName, archive.part, Object.fromEntries(Object.entries(packedManifest)), entries, manifest.pins));
    }
    for (const finding of findings)
      this.report(finding);
    if (findings.length > 0)
      return 1;

    return isRelease && !Object.isNull(commit) ? await this.checkReleaseAsync(version, commit) : 0;
  }

  private async readReleasedVersionAsync(): Promise<unknown> {
    const file = path.join(this.root, Resources.versionFile);
    const text = existsSync(file) ? await readFile(file, Resources.utf8Encoding) : Resources.jsonNull;
    let content: unknown;
    try {
      content = JSON.parse(text);
    }
    catch (error) {
      if (!(error instanceof SyntaxError))
        throw error;
      return undefined;
    }

    return Object.isObject(content) ? Object.entries(content).find(([field]) => field === Resources.versionField)?.[1] : undefined;
  }

  private archiveOf(part: WorkspacePart, version: string): string {
    return path.join(this.root, Resources.archivesFolder, Resources.formatArchiveName(part.name, version));
  }
}
