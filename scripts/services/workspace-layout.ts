/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { ManifestFieldMissingException } from "../exceptions/manifest-field-missing.exception.ts";
import { ManifestFieldNotStringException } from "../exceptions/manifest-field-not-string.exception.ts";
import { ManifestNotObjectException } from "../exceptions/manifest-not-object.exception.ts";
import { GitBuilds } from "../models/git-builds.ts";
import { WorkspacePart } from "../models/workspace-part.ts";
import { Resources } from "../resources.ts";

export class WorkspaceLayout {
  private readonly root: string;

  public constructor(root: string) {
    this.root = root;
  }

  public static get moduleName(): string {
    return `${Resources.packageScope}${Resources.pathSeparator}${path.posix.basename(Resources.moduleFolder).slice(Resources.companyPrefix.length)}`;
  }

  public static gitPackageName(target: string): string {
    return Resources.formatGitPackageName(WorkspaceLayout.moduleName, target);
  }

  public static gitManifestFile(target: string): string {
    return path.posix.join(Resources.gitFolder, Resources.gitManifestsFolder, target, Resources.manifestFile);
  }

  public async readPartsAsync(): Promise<readonly WorkspacePart[]> {
    const packages = [
      [Resources.formatProtocolPackageName(WorkspaceLayout.moduleName), Resources.protocolFolder],
      [WorkspaceLayout.moduleName, Resources.moduleFolder]
    ] as const;
    const parts: WorkspacePart[] = [];
    for (const [expectedName, folder] of packages) {
      const manifestFile = path.posix.join(folder, Resources.manifestFile);
      parts.push(new WorkspacePart(WorkspaceLayout.readString(await this.readJsonAsync(manifestFile), Resources.nameField, manifestFile), expectedName, folder, Resources.sourcesFolder));
    }

    return parts;
  }

  public async readGitPartsAsync(): Promise<readonly WorkspacePart[]> {
    return (await this.readBuildsAsync()).targets.map(t =>
      new WorkspacePart(WorkspaceLayout.gitPackageName(t.target), WorkspaceLayout.gitPackageName(t.target), Resources.gitFolder, Resources.gitSourcesFolder));
  }

  public async readReleasePartsAsync(): Promise<readonly WorkspacePart[]> {
    return [...await this.readGitPartsAsync(), ...await this.readPartsAsync()];
  }

  public async readBuildsAsync(): Promise<GitBuilds> {
    const file = path.posix.join(Resources.gitFolder, Resources.buildsFile);
    return GitBuilds.parse(await this.readJsonAsync(file), file);
  }

  public async readInstalledPinsAsync(pins: ReadonlyMap<string, string>): Promise<readonly string[]> {
    const kept: string[] = [];
    for (const name of [...pins.keys()].filter(t => t.startsWith(Resources.noldovaPrefix))) {
      const file = path.join(this.root, Resources.nodeModulesFolder, ...name.split(Resources.pathSeparator), Resources.manifestFile);
      if (!existsSync(file))
        continue;
      const installed: unknown = JSON.parse(await readFile(file, Resources.utf8Encoding));
      if (typeof installed !== "object" || installed === null || Array.isArray(installed))
        throw new ManifestNotObjectException(file);
      kept.push(Resources.formatPackageSpec(name, WorkspaceLayout.readString(installed, Resources.versionField, file)));
    }
    return kept;
  }

  private static readField(json: unknown, field: string, file: string): unknown {
    const fields = typeof json === "object" && json !== null && !Array.isArray(json) ? new Map<string, unknown>(Object.entries(json)) : new Map<string, unknown>();
    if (!fields.has(field))
      throw new ManifestFieldMissingException(file, field);

    return fields.get(field);
  }

  private static readString(json: unknown, field: string, file: string): string {
    const value = WorkspaceLayout.readField(json, field, file);
    if (typeof value !== "string")
      throw new ManifestFieldNotStringException(file, field);

    return value;
  }

  private async readJsonAsync(file: string): Promise<unknown> {
    return JSON.parse(await readFile(path.join(this.root, file), Resources.utf8Encoding));
  }
}
