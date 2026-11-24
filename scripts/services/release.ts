/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { Writable } from "node:stream";

import "@noldova/context.core";

import { PackageException } from "../exceptions/package.exception.ts";
import { ProcessException } from "../exceptions/process.exception.ts";
import { ReleaseCommitInvalidException } from "../exceptions/release-commit-invalid.exception.ts";
import { ReleaseFindingsException } from "../exceptions/release-findings.exception.ts";
import { ReleaseFolderMissingException } from "../exceptions/release-folder-missing.exception.ts";
import { ReleaseHeadDiffersException } from "../exceptions/release-head-differs.exception.ts";
import { ReleaseManifestFieldInvalidException } from "../exceptions/release-manifest-field-invalid.exception.ts";
import { ReleaseManifestInvalidException } from "../exceptions/release-manifest-invalid.exception.ts";
import { ReleaseManifestNotObjectException } from "../exceptions/release-manifest-not-object.exception.ts";
import { ReleaseVariableMissingException } from "../exceptions/release-variable-missing.exception.ts";
import { ReleaseVersionInvalidException } from "../exceptions/release-version-invalid.exception.ts";
import { ReleaseException } from "../exceptions/release.exception.ts";
import { ReleaseArchive } from "../models/release-archive.ts";
import { RootManifest } from "../models/root-manifest.ts";
import type { WorkspacePart } from "../models/workspace-part.ts";
import { Resources } from "../resources.ts";
import { ArchiveCheck } from "./archive-check.ts";
import { ArchiveReader } from "./archive-reader.ts";
import { Git } from "./git.ts";
import type { ProcessRunner } from "./process-runner.ts";
import { WorkspaceLayout } from "./workspace-layout.ts";

export class Release {
  private static readonly MANIFEST_ENTRY: string = Resources.formatArchiveEntry(Resources.manifestFile);
  private static readonly DEPENDENCIES_FIELDS: readonly string[] = [Resources.dependenciesField, Resources.optionalDependenciesField];

  private readonly root: string;
  private readonly git: Git;
  private readonly environment: NodeJS.ProcessEnv;
  private readonly output: Writable;
  private readonly archiveReader: ArchiveReader = new ArchiveReader();

  public constructor(root: string, runner: ProcessRunner, environment: NodeJS.ProcessEnv, output: Writable) {
    this.root = root;
    this.git = new Git(root, runner);
    this.environment = environment;
    this.output = output;
  }

  public async runAsync(releaseArguments: readonly string[]): Promise<number> {
    const [command, ...values] = releaseArguments;
    try {
      if (command === Resources.checkCommand && values.length === 3)
        await this.checkArchivesAsync(String(values[0]), Release.validateVersion(values[1]), Release.validateCommit(values[2]));
      else {
        this.output.write(Resources.releaseUsage);
        return Resources.usageExitCode;
      }
      return 0;
    }
    catch (error) {
      if (!(error instanceof ReleaseException || error instanceof PackageException || error instanceof ProcessException))
        throw error;
      this.output.write(Resources.formatLine(error.message));
      return 1;
    }
  }

  private static parseObject(text: string, context: string): Readonly<Record<string, unknown>> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    }
    catch (error) {
      if (!(error instanceof SyntaxError))
        throw error;
      throw new ReleaseManifestInvalidException(context, error);
    }
    if (!Object.isObject(parsed) || Array.isArray(parsed))
      throw new ReleaseManifestNotObjectException(context);
    return Object.fromEntries(Object.entries(parsed));
  }

  private static validateVersion(version: string | undefined): string {
    if (Object.isUndefined(version) || !Resources.releaseVersionPattern.test(version))
      throw new ReleaseVersionInvalidException(version);

    return version;
  }

  private static validateCommit(commit: string | undefined): string {
    if (Object.isUndefined(commit) || !Resources.commitPattern.test(commit))
      throw new ReleaseCommitInvalidException(commit);

    return commit;
  }

  private static readText(fields: Readonly<Record<string, unknown>>, field: string, context: string): string {
    const value = fields[field];
    if (!Object.isString(value))
      throw new ReleaseManifestFieldInvalidException(context, field);
    return value;
  }

  private static readDependencies(manifest: Readonly<Record<string, unknown>>, field: string, context: string): Readonly<Record<string, unknown>> {
    const value = manifest[field];
    if (Object.isNullOrUndefined(value))
      return {};
    if (!Object.isObject(value) || Array.isArray(value))
      throw new ReleaseManifestFieldInvalidException(context, field);
    return Object.fromEntries(Object.entries(value));
  }

  private async checkArchivesAsync(folder: string, version: string, commit: string): Promise<void> {
    await this.checkHeadAsync(commit);
    for (const archive of await this.listArchivesAsync(folder, version, commit))
      this.output.write(Resources.formatLine(Resources.formatArchiveChecked(path.basename(archive.filePath), archive.part.name, version, commit)));
  }

  private async listPackagesAsync(): Promise<readonly WorkspacePart[]> {
    return new WorkspaceLayout(this.root).readReleasePartsAsync();
  }

  private async listArchivesAsync(folder: string, version: string, commit: string): Promise<readonly ReleaseArchive[]> {
    const directory = path.resolve(this.root, folder);
    if (!existsSync(directory))
      throw new ReleaseFolderMissingException(folder);

    const scope = this.readVariable(Resources.scopeVariable);
    const pins = RootManifest.parse(await readFile(path.join(this.root, Resources.manifestFile), Resources.utf8Encoding)).pins;
    const archives = (await this.listPackagesAsync()).map(t => new ReleaseArchive(t, path.join(directory, Resources.formatArchiveName(t.name, version))));
    const expected = archives.map(t => path.basename(t.filePath));
    const found = (await readdir(directory)).sort();
    const findings = [
      ...expected.filter(t => !found.includes(t)).map(t => Resources.formatArchiveMissing(folder, t)),
      ...found.filter(t => !expected.includes(t)).map(t => Resources.formatArchiveUnexpected(folder, t, version))
    ];

    const names = archives.map(t => t.part.name);
    for (const archive of archives.filter(t => found.includes(path.basename(t.filePath))))
      findings.push(...await this.checkArchiveAsync(archive, version, commit, scope, names, pins));

    if (findings.length > 0)
      throw new ReleaseFindingsException(findings);

    return archives;
  }

  private async checkArchiveAsync(archive: ReleaseArchive, version: string, commit: string, scope: string, names: readonly string[],
    pins: ReadonlyMap<string, string>): Promise<readonly string[]> {
    const archiveName = path.basename(archive.filePath);
    const tooLarge = ArchiveCheck.checkSize(archiveName, (await stat(archive.filePath)).size);
    if (!Object.isNull(tooLarge))
      return [tooLarge];

    const entries = await this.archiveReader.readAsync(archive.filePath);
    const content = entries.get(Release.MANIFEST_ENTRY);
    if (Object.isUndefined(content))
      return [Resources.formatArchiveManifestMissing(archiveName)];

    const context = Resources.formatManifestContext(archiveName);
    const manifest = Release.parseObject(content.toString(Resources.utf8Encoding), context);
    const findings: string[] = [];
    const name = Release.readText(manifest, Resources.nameField, context);
    if (name !== archive.part.name)
      findings.push(Resources.formatFieldDiffers(archiveName, Resources.nameField, name, archive.part.name));
    if (!name.startsWith(`${scope}${Resources.scopeSeparator}`))
      findings.push(Resources.formatOutsideScope(archiveName, name, scope));

    const foundVersion = Release.readText(manifest, Resources.versionField, context);
    if (foundVersion !== version)
      findings.push(Resources.formatFieldDiffers(archiveName, Resources.versionField, foundVersion, version));
    if (manifest[Resources.privateField] === true)
      findings.push(Resources.formatMarkedPrivate(archiveName));
    const foundCommit = manifest[Resources.commitField];
    if (!Object.isString(foundCommit))
      findings.push(Resources.formatCommitMissing(archiveName, commit));
    else if (foundCommit !== commit)
      findings.push(Resources.formatFieldDiffers(archiveName, Resources.commitField, foundCommit, commit));

    for (const field of Release.DEPENDENCIES_FIELDS) {
      const dependencies = Release.readDependencies(manifest, field, context);
      for (const dependency of Object.keys(dependencies).filter(t => names.includes(t))) {
        const range = Release.readText(dependencies, dependency, Resources.formatFieldPath(context, field));
        if (range !== version)
          findings.push(Resources.formatDependencyDiffers(archiveName, dependency, range, version));
      }
    }
    findings.push(...ArchiveCheck.check(archiveName, archive.part, manifest, entries, pins));

    return findings;
  }

  private async checkHeadAsync(commit: string): Promise<void> {
    const head = (await this.git.readOutputAsync([Resources.revParseCommand, Resources.headReference])).trim();
    if (head !== commit)
      throw new ReleaseHeadDiffersException(head, commit);
  }

  private readVariable(name: string): string {
    const value = this.environment[name];
    if (Object.isUndefined(value) || value.length === 0)
      throw new ReleaseVariableMissingException(name);

    return value;
  }
}
