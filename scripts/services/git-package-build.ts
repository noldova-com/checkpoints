/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { constants, copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { ArchiveHashMismatchException } from "../exceptions/archive-hash-mismatch.exception.ts";
import { ArchiveLongerThanPinnedException } from "../exceptions/archive-longer-than-pinned.exception.ts";
import { ArchiveSizeMismatchException } from "../exceptions/archive-size-mismatch.exception.ts";
import { BuildFileMissingException } from "../exceptions/build-file-missing.exception.ts";
import { ComponentsDifferException } from "../exceptions/components-differ.exception.ts";
import { DownloadFailedException } from "../exceptions/download-failed.exception.ts";
import { DroppedUnlistedException } from "../exceptions/dropped-unlisted.exception.ts";
import { GitManifestDiffersException } from "../exceptions/git-manifest-differs.exception.ts";
import { GitManifestMissingException } from "../exceptions/git-manifest-missing.exception.ts";
import { LicenceTextMissingException } from "../exceptions/licence-text-missing.exception.ts";
import { ListingDiffersException } from "../exceptions/listing-differs.exception.ts";
import { PackageVersionsMissingException } from "../exceptions/package-versions-missing.exception.ts";
import { PackingFailedException } from "../exceptions/packing-failed.exception.ts";
import { PartBuildMissingException } from "../exceptions/part-build-missing.exception.ts";
import type { GitBuilds } from "../models/git-builds.ts";
import type { SourceSet } from "../models/source-set.ts";
import { GitComponent } from "../models/git-component.ts";
import type { GitTarget } from "../models/git-target.ts";
import type { WorkspacePart } from "../models/workspace-part.ts";
import { Resources } from "../resources.ts";
import { BuildArchive } from "./build-archive.ts";
import type { NpmCommand } from "./npm-command.ts";
import { PackagePacker } from "./package-packer.ts";
import { WorkspaceLayout } from "./workspace-layout.ts";

export class GitPackageBuild {
  private static readonly CACHE_SEGMENTS: readonly string[] = [Resources.buildWorkFolder, Resources.gitArchivesFolder];

  private readonly builds: GitBuilds;
  private readonly npm: NpmCommand;
  private readonly report: (line: string) => void;
  private readonly root: string;

  public constructor(root: string, builds: GitBuilds, npm: NpmCommand, report: (line: string) => void) {
    this.builds = builds;
    this.npm = npm;
    this.report = report;
    this.root = root;
  }

  public async packAsync(part: WorkspacePart, version: string, commit: string | null = null): Promise<void> {
    const target = this.builds.targets.find(t => WorkspaceLayout.gitPackageName(t.target) === part.name);
    if (target === undefined)
      throw new PartBuildMissingException(part.name);
    const output = path.join(this.root, ...PackagePacker.workSegments, Resources.formatGitWorkFolder(target.target));
    await rm(output, { recursive: true, force: true });

    const listing = await this.readLinesAsync(Resources.listingsFolder, target);
    const listed = listing.map(t => t.split(Resources.columnSeparator).slice(Resources.listingPathColumn, Resources.listingPathColumn + 1).join(""));
    const dropped = await this.readLinesAsync(Resources.droppedFolder, target);
    const unlisted = dropped.find(t => !listed.includes(t) && !listed.some(u => t.endsWith(Resources.pathSeparator) && u.startsWith(t)));
    if (unlisted !== undefined)
      throw new DroppedUnlistedException(target.target, unlisted);

    const archive = await this.readArchiveAsync(target);
    const build = await new BuildArchive(path.join(output, part.sources), dropped, target.program, target.execPath).unpackAsync(archive, target.kind);
    const differences = [
      ...build.entries.filter(t => !listed.includes(t)).map(t => Resources.formatArchiveEntryUnlisted(target.url, t, target.target)),
      ...listed.filter(t => !build.entries.includes(t)).map(t => Resources.formatListedEntryMissing(target.target, t, target.url))
    ];
    if (differences.length > 0)
      throw new ListingDiffersException(differences);
    this.report(Resources.formatUnpacked(part.name, build.fileCount, target.gitVersion, dropped.length));
    for (const file of [target.program, target.execPath, ...target.path])
      if (!existsSync(path.join(output, part.sources, ...file.split(Resources.pathSeparator))))
        throw new BuildFileMissingException(target.url, file, target.target);

    const componentsFile = Resources.formatComponentsFile(target.target);
    const components = GitComponent.parseList(JSON.parse(await readFile(path.join(this.root, Resources.gitFolder, componentsFile), Resources.utf8Encoding)), componentsFile);
    await this.checkPackageVersionsAsync(path.join(output, part.sources, ...Resources.packageVersionsFile.split(Resources.pathSeparator)), target, componentsFile, components);
    for (const component of components)
      for (const text of component.texts) {
        const isBuild = text.startsWith(Resources.buildTextPrefix);
        const inBuild = isBuild ? text.slice(Resources.buildTextPrefix.length) : null;
        const source = inBuild !== null
          ? path.join(output, part.sources, ...inBuild.split(Resources.pathSeparator))
          : path.join(this.root, Resources.gitFolder, ...text.split(Resources.pathSeparator));
        if (!existsSync(source))
          throw new LicenceTextMissingException(componentsFile, component.name, text, isBuild);
        const name = (inBuild !== null ? Resources.licenseFolderPattern.exec(inBuild)?.groups?.[Resources.licensePathGroup] : undefined) ?? path.posix.basename(text);
        const destination = path.join(output, Resources.licensesFolder, component.name, ...name.split(Resources.pathSeparator));
        await mkdir(path.dirname(destination), { recursive: true });
        await copyFile(source, destination, constants.COPYFILE_EXCL);
      }
    const license = GitComponent.licenseOf(components);
    const source = target.sourceSet;
    const unpacked = await GitPackageBuild.listFilesAsync(path.join(output, part.sources), part.sources);
    await this.checkManifestAsync(target, GitPackageBuild.manifestOf(part, target, version, null, license, unpacked, source));
    await writeFile(path.join(output, Resources.readmeFile), GitPackageBuild.readmeOf(part, target, components, source));
    await writeFile(path.join(output, Resources.licenseFile), Resources.formatGitLicense(part.name, target.gitVersion, target.target, target.source, license, source.pages));
    await writeFile(path.join(output, Resources.manifestFile), GitPackageBuild.manifestOf(part, target, version, commit, license, unpacked, source));

    const archives = path.join(this.root, Resources.archivesFolder);
    await mkdir(archives, { recursive: true });
    const result = await this.npm.runAsync([...PackagePacker.packArguments, archives], output);
    if (!result.isSuccessful)
      throw new PackingFailedException(part.name, result.exitCode, result.text);
  }

  public async readArchiveAsync(target: GitTarget): Promise<Buffer> {
    const cached = path.join(this.root, ...GitPackageBuild.CACHE_SEGMENTS, Resources.formatCachedArchive(target.target, target.sha256, target.kind));
    if (existsSync(cached)) {
      const archive = await readFile(cached);
      if (GitPackageBuild.hashOf(archive) === target.sha256)
        return archive;
    }

    this.report(Resources.formatDownloading(target.url));
    const response = await fetch(target.url, { signal: AbortSignal.timeout(Resources.downloadTimeout) });
    if (!response.ok)
      throw new DownloadFailedException(target.url, response.status);
    const declared = response.headers.get(Resources.contentLengthHeader);
    if (declared !== null && Number(declared) !== target.size)
      throw new ArchiveSizeMismatchException(target.url, Number(declared), target.size);
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (let read = await reader?.read(); read !== undefined && !read.done; read = await reader?.read()) {
      const chunk = Buffer.from(read.value);
      size += chunk.length;
      if (size > target.size)
        throw new ArchiveLongerThanPinnedException(target.url, target.size);
      chunks.push(chunk);
    }
    const archive = Buffer.concat(chunks);
    if (archive.length !== target.size)
      throw new ArchiveSizeMismatchException(target.url, archive.length, target.size);
    const hash = GitPackageBuild.hashOf(archive);
    if (hash !== target.sha256)
      throw new ArchiveHashMismatchException(target.url, hash, target.sha256);

    await mkdir(path.dirname(cached), { recursive: true });
    await writeFile(cached, archive);
    return archive;
  }

  private static hashOf(archive: Buffer): string {
    return createHash(Resources.sha256Algorithm).update(archive).digest(Resources.hexEncoding);
  }

  private static async listFilesAsync(folder: string, prefix: string): Promise<readonly string[]> {
    return (await readdir(folder, { recursive: true, withFileTypes: true }))
      .filter(t => t.isFile())
      .map(t => [prefix, ...path.relative(folder, path.join(t.parentPath, t.name)).split(path.sep)].join(Resources.pathSeparator))
      .sort();
  }

  private static manifestOf(part: WorkspacePart, target: GitTarget, version: string, commit: string | null, license: string, unpacked: readonly string[],
    source: SourceSet): string {
    const inBuild = (file: string): string => `${part.sources}${Resources.pathSeparator}${file}`;
    return Resources.formatLine(JSON.stringify({
      name: part.name,
      version,
      ...(commit === null ? {} : { gitHead: commit }),
      description: Resources.formatGitPackageDescription(target.gitVersion, target.target),
      license,
      repository: { type: Resources.gitRepositoryType, url: Resources.repositoryAddress, directory: Resources.gitFolder },
      homepage: Resources.homepageAddress,
      bugs: { url: Resources.issuesAddress },
      os: [target.platform],
      cpu: [target.architecture],
      exports: { [Resources.manifestExport]: Resources.manifestExport },
      publishConfig: { access: Resources.publicAccess, registry: Resources.npmRegistryAddress },
      noldova: {
        git: {
          program: inBuild(target.program),
          execPath: inBuild(target.execPath),
          path: target.path.map(inBuild),
          version: target.gitVersion,
          source: target.source,
          build: target.url
        }
      },
      noldovaDesktop: { unpacked, sourcePages: source.pages, sources: source.files }
    }, null, Resources.jsonIndent));
  }

  private static readmeOf(part: WorkspacePart, target: GitTarget, components: readonly GitComponent[], source: SourceSet): string {
    return Resources.formatGitReadme(part.name, target.gitVersion, target.target, target.url, target.sha256, target.source, source.pages,
      components.map(t => Resources.formatComponentRow(t.name, t.version, t.license)));
  }

  private async checkPackageVersionsAsync(file: string, target: GitTarget, componentsFile: string, components: readonly GitComponent[]): Promise<void> {
    if (!existsSync(file) && target.url.startsWith(Resources.formatReleaseDownloadPrefix(Resources.minGitRepository)))
      throw new PackageVersionsMissingException(target.target, target.url);
    if (!existsSync(file))
      return;
    const listed = (await readFile(file, Resources.utf8Encoding)).split(Resources.lineFeed).map(t => t.trim()).filter(t => t !== "");
    const kept = components.map(t => Resources.formatPackageVersion(t.name, t.version));
    const unshipped = await this.readLinesAsync(Resources.droppedComponentsFolder, target);
    const differences = [
      ...listed.filter(t => !kept.includes(t) && !unshipped.includes(t)).map(t => Resources.formatPackageVersionUnlisted(componentsFile, t)),
      ...kept.filter(t => !listed.includes(t)).map(t => Resources.formatComponentNotInBuild(componentsFile, t)),
      ...unshipped.filter(t => !listed.includes(t)).map(t => Resources.formatDroppedComponentNotInBuild(target.target, t))
    ];
    if (differences.length > 0)
      throw new ComponentsDifferException(componentsFile, differences);
  }

  private async checkManifestAsync(target: GitTarget, expected: string): Promise<void> {
    const file = WorkspaceLayout.gitManifestFile(target.target);
    const committed = path.join(this.root, ...file.split(Resources.pathSeparator));
    if (!existsSync(committed))
      throw new GitManifestMissingException(file, expected);
    if ((await readFile(committed, Resources.utf8Encoding)).replaceAll(Resources.carriageReturnLineFeed, Resources.lineFeed) !== expected)
      throw new GitManifestDiffersException(file, target.target, expected);
  }

  private async readLinesAsync(folder: string, target: GitTarget): Promise<readonly string[]> {
    const text = await readFile(path.join(this.root, Resources.gitFolder, folder, Resources.formatTargetTextFile(target.target)), Resources.utf8Encoding);
    return text.split(Resources.lineFeed).filter(t => t !== "");
  }
}
