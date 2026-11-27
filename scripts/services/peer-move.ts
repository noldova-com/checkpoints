/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import "@noldova/context.core";

import { PackageException } from "../exceptions/package.exception.ts";
import { PeerManifestUnreadableException } from "../exceptions/peer-manifest-unreadable.exception.ts";
import { PeerVersionsNotJsonException } from "../exceptions/peer-versions-not-json.exception.ts";
import { ProcessException } from "../exceptions/process.exception.ts";
import { RootManifest } from "../models/root-manifest.ts";
import { VersionRange } from "../models/version-range.ts";
import { Resources } from "../resources.ts";
import { ErrorCode } from "./error-code.ts";
import type { NpmCommand } from "./npm-command.ts";
import type { WorkspaceLayout } from "./workspace-layout.ts";

export class PeerMove {
  private static readonly INSTALL_ARGUMENTS: readonly string[] = [
    Resources.installCommand,
    Resources.noSaveOption,
    Resources.ignoreScriptsOption,
    Resources.noAuditOption,
    Resources.noFundOption,
    Resources.errorLogLevelOption
  ];

  private readonly layout: WorkspaceLayout;
  private readonly npm: NpmCommand;
  private readonly report: (line: string) => void;
  private readonly root: string;

  public constructor(root: string, layout: WorkspaceLayout, npm: NpmCommand, report: (line: string) => void) {
    this.layout = layout;
    this.npm = npm;
    this.report = report;
    this.root = root;
  }

  public async runAsync(): Promise<number> {
    try {
      const ranges = await this.readRangesAsync();
      if (ranges.size === 0)
        return 0;
      const manifest = RootManifest.parse(await readFile(path.join(this.root, Resources.manifestFile), Resources.utf8Encoding));
      const names = [...new Set([...ranges.keys(), ...[...manifest.pins.keys()].filter(t => t.startsWith(Resources.contextPrefix))])];
      let common: readonly string[] | undefined;
      for (const name of names) {
        const versions = await this.publishedAsync(name, ranges.get(name) ?? []);
        if (Object.isUndefined(versions))
          return 1;
        common = Object.isUndefined(common) ? versions : common.filter(t => versions.includes(t));
      }
      const together = (common ?? []).reduce<string | undefined>((found, t) => Object.isUndefined(found) || VersionRange.isNewer(t, found) ? t : found, undefined);
      if (Object.isUndefined(together)) {
        this.report(Resources.formatPeerNoCommonVersion(names));
        return 1;
      }
      const chosen = new Map<string, string>(names.map(t => [t, together]));
      const kept = await this.layout.readInstalledPinsAsync(new Map([...manifest.pins].filter(([name]) => !chosen.has(name))));
      const moved = [...chosen].map(([name, version]) => Resources.formatPackageSpec(name, version));
      const result = await this.npm.runAsync([...PeerMove.INSTALL_ARGUMENTS, ...moved, ...kept], this.root);
      if (!result.isSuccessful) {
        this.report(Resources.formatPeerMoveFailed(result.exitCode, result.text));
        return 1;
      }
      let failed = 0;
      for (const [name, version] of chosen) {
        const installed = await this.readInstalledAsync(name);
        if (installed === version)
          this.report(Resources.formatPeerMoved(name, version));
        else {
          this.report(Resources.formatPeerNotMoved(name, String(installed), version));
          failed++;
        }
      }
      return failed === 0 ? 0 : 1;
    }
    catch (error) {
      if (!(error instanceof ProcessException || error instanceof PackageException))
        throw error;
      this.report(error.message);
      return 1;
    }
  }

  private static fieldsOf(json: unknown): ReadonlyMap<string, unknown> {
    return Object.isObject(json) && !Array.isArray(json) ? new Map<string, unknown>(Object.entries(json)) : new Map<string, unknown>();
  }

  private static parseVersions(name: string, output: string): unknown {
    try {
      return JSON.parse(output);
    }
    catch (error) {
      if (!(error instanceof SyntaxError))
        throw error;
      throw new PeerVersionsNotJsonException(name, output, error);
    }
  }

  private async readRangesAsync(): Promise<ReadonlyMap<string, readonly string[]>> {
    const ranges = new Map<string, string[]>();
    for (const part of await this.layout.readPartsAsync()) {
      const manifest: unknown = JSON.parse(await readFile(path.join(this.root, part.folder, Resources.manifestFile), Resources.utf8Encoding));
      for (const [name, range] of PeerMove.fieldsOf(PeerMove.fieldsOf(manifest).get(Resources.peerDependenciesField)))
        if (name.startsWith(Resources.contextPrefix) && Object.isString(range))
          ranges.set(name, [...ranges.get(name) ?? [], range]);
    }
    return ranges;
  }

  private async publishedAsync(name: string, ranges: readonly string[]): Promise<readonly string[] | undefined> {
    const parsed = ranges.map(t => VersionRange.parse(t));
    const holding = parsed.filter(t => !Object.isNull(t));
    if (holding.length !== parsed.length) {
      for (const range of ranges.filter(t => Object.isNull(VersionRange.parse(t))))
        this.report(Resources.formatPeerRangeInvalid(Resources.manifestFile, name, range));
      return undefined;
    }
    const result = await this.npm.runAsync([Resources.viewCommand, name, Resources.versionsField, Resources.jsonOption], this.root);
    if (!result.isSuccessful) {
      this.report(Resources.formatPeerVersionsUnread(name, result.exitCode, result.text));
      return undefined;
    }
    const published = PeerMove.parseVersions(name, result.output);
    const versions = (Array.isArray(published) ? published : [published])
      .filter((t: unknown): t is string => Object.isString(t) && Resources.plainVersionPattern.test(t) && holding.every(u => u.holds(t)));
    if (versions.length > 0)
      return versions;
    this.report(Resources.formatPeerNoVersion(name, [...new Set(ranges)]));
    return undefined;
  }

  private async readInstalledAsync(name: string): Promise<unknown> {
    const file = path.join(this.root, Resources.nodeModulesFolder, ...name.split(Resources.pathSeparator), Resources.manifestFile);
    try {
      return PeerMove.fieldsOf(JSON.parse(await readFile(file, Resources.utf8Encoding))).get(Resources.versionField);
    }
    catch (error) {
      if (!(error instanceof SyntaxError || ErrorCode.of(error) === Resources.missingCode))
        throw error;
      throw new PeerManifestUnreadableException(name, file, error);
    }
  }
}
