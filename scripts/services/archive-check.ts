/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ParsedJson } from "../models/parsed-json.ts";
import { VersionRange } from "../models/version-range.ts";
import type { WorkspacePart } from "../models/workspace-part.ts";
import { Resources } from "../resources.ts";

export class ArchiveCheck {
  private static readonly PINNED_FIELDS: readonly string[] = [Resources.dependenciesField, Resources.optionalDependenciesField, Resources.peerDependenciesField];
  private static readonly TARGET_FIELDS: readonly string[] = [Resources.osField, Resources.cpuField];

  public static checkSize(archiveName: string, size: number): string | null {
    return size < Resources.registryLimit ? null : Resources.formatArchiveTooLarge(archiveName, size);
  }

  public static check(archiveName: string, part: WorkspacePart, manifest: Readonly<Record<string, unknown>>, entries: ReadonlyMap<string, Buffer>,
    rootPins: ReadonlyMap<string, string>): readonly string[] {
    const findings: string[] = [];
    const version = manifest[Resources.versionField];
    const content = part.folder === Resources.moduleFolder ? entries.get(Resources.formatArchiveEntry(Resources.moduleFile)) : undefined;
    const declaration = content === undefined ? null : ArchiveCheck.parseJson(content);
    if (part.folder === Resources.moduleFolder)
      findings.push(...ArchiveCheck.checkModule(archiveName, version, content, declaration));
    const range = ArchiveCheck.readObject(declaration?.value)?.[Resources.noldovaDesktopField];

    const exports = ArchiveCheck.readObject(manifest[Resources.exportsField]);
    if (exports === null)
      findings.push(Resources.formatExportsMissing(archiveName));
    for (const [subpath, target] of Object.entries(exports ?? {}))
      for (const file of typeof target === "string" ? [target] : Object.values(ArchiveCheck.readObject(target) ?? {}))
        if (typeof file !== "string" || !entries.has(Resources.formatArchiveEntry(file.slice(Resources.relativePrefix.length))))
          findings.push(Resources.formatExportFileMissing(archiveName, subpath, String(file)));

    for (const field of ArchiveCheck.PINNED_FIELDS)
      for (const [name, taken] of Object.entries(ArchiveCheck.readObject(manifest[field]) ?? {}))
        if (field === Resources.peerDependenciesField && name.startsWith(Resources.noldovaPrefix))
          findings.push(...ArchiveCheck.checkPeerRange(archiveName, name, taken, typeof range === "string" && name.startsWith(Resources.noldovaDesktopPrefix) ? range : null,
            rootPins.get(name)));
        else if (typeof taken !== "string" || !Resources.exactVersionPattern.test(taken))
          findings.push(Resources.formatDependencyNotExact(archiveName, name, String(taken), field));

    if (part.folder === Resources.gitFolder)
      findings.push(...ArchiveCheck.checkGit(archiveName, manifest, entries));

    return findings;
  }

  private static parseJson(content: Buffer): ParsedJson | null {
    try {
      return new ParsedJson(JSON.parse(content.toString(Resources.utf8Encoding)));
    }
    catch (error) {
      if (!(error instanceof SyntaxError))
        throw error;
      return null;
    }
  }

  private static checkModule(archiveName: string, version: unknown, content: Buffer | undefined, declaration: ParsedJson | null): readonly string[] {
    if (content === undefined)
      return [Resources.formatModuleFileMissing(archiveName)];
    if (declaration === null)
      return [Resources.formatModuleFileNotJson(archiveName)];

    const declared = ArchiveCheck.readObject(declaration.value);
    const findings: string[] = [];
    if (declared?.[Resources.versionField] !== version)
      findings.push(Resources.formatModuleVersionDiffers(archiveName, String(declared?.[Resources.versionField]), String(version)));
    const range = declared?.[Resources.noldovaDesktopField];
    if (range !== undefined && (typeof range !== "string" || !ArchiveCheck.isRange(range)))
      findings.push(Resources.formatNoldovaDesktopRangeInvalid(archiveName, String(range)));
    return findings;
  }

  private static checkPeerRange(archiveName: string, name: string, taken: unknown, moduleRange: string | null, pin: string | undefined): readonly string[] {
    const range = typeof taken === "string" ? VersionRange.parse(taken) : null;
    if (range === null || !range.isStandard)
      return [Resources.formatPeerRangeInvalid(archiveName, name, String(taken))];
    if (moduleRange !== null && taken !== moduleRange)
      return [Resources.formatPeerOutsideRange(archiveName, name, String(taken), Resources.peerDependenciesField, moduleRange)];
    if (pin === undefined || !Resources.plainVersionPattern.test(pin))
      return [Resources.formatPeerPinMissing(archiveName, name, String(pin))];
    return range.holds(pin) ? [] : [Resources.formatPeerRangeMissesPin(archiveName, name, String(taken), pin)];
  }

  private static isRange(range: string): boolean {
    return VersionRange.parse(range)?.isStandard === true;
  }

  private static checkGit(archiveName: string, manifest: Readonly<Record<string, unknown>>, entries: ReadonlyMap<string, Buffer>): readonly string[] {
    const findings: string[] = [];
    for (const field of ArchiveCheck.TARGET_FIELDS) {
      const value = manifest[field];
      if (!Array.isArray(value) || value.length !== 1 || typeof value[0] !== "string")
        findings.push(Resources.formatTargetMissing(archiveName, field));
    }
    const program = ArchiveCheck.readObject(ArchiveCheck.readObject(manifest[Resources.ownField])?.[Resources.gitField])?.[Resources.programField];
    if (typeof program !== "string" || !entries.has(Resources.formatArchiveEntry(program)))
      findings.push(Resources.formatGitProgramMissing(archiveName, String(program)));
    return findings;
  }

  private static readObject(value: unknown): Readonly<Record<string, unknown>> | null {
    return typeof value === "object" && value !== null && !Array.isArray(value) ? Object.fromEntries(Object.entries(value)) : null;
  }
}
