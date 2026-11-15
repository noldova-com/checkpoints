/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { existsSync, readdirSync } from "node:fs";
import { copyFile, cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { CompilingFailedException } from "../exceptions/compiling-failed.exception.ts";
import { ExportSourceInvalidException } from "../exceptions/export-source-invalid.exception.ts";
import { ExportsInvalidException } from "../exceptions/exports-invalid.exception.ts";
import { ManifestNotObjectException } from "../exceptions/manifest-not-object.exception.ts";
import { OwnDependenciesInvalidException } from "../exceptions/own-dependencies-invalid.exception.ts";
import { PackageException } from "../exceptions/package.exception.ts";
import { PackingFailedException } from "../exceptions/packing-failed.exception.ts";
import { PackageCopy } from "../models/package-copy.ts";
import type { WorkspacePart } from "../models/workspace-part.ts";
import { Resources } from "../resources.ts";
import type { NpmCommand } from "./npm-command.ts";
import { PackageBuild } from "./package-build.ts";
import type { ProcessRunner } from "./process-runner.ts";

export class PackagePacker {
  public static readonly workSegments: readonly string[] = [Resources.buildWorkFolder, Resources.packagesFolder];
  public static readonly packArguments: readonly string[] = [Resources.packCommand, Resources.ignoreScriptsOption, Resources.errorLogLevelOption, Resources.packDestinationOption];
  private static readonly MODULE_FILES: readonly string[] = [Resources.moduleFile, Resources.settingsFile, Resources.menusFile, Resources.cliFile, Resources.webViewsFile];
  private static readonly UNPACKED_FIELDS: readonly string[] = [Resources.scriptsField, Resources.devDependenciesField];
  private static readonly COMPILE_ARGUMENTS: readonly string[] = [
    Resources.noEmitOption,
    Resources.falseValue,
    Resources.rewriteRelativeImportExtensionsOption,
    Resources.declarationOption,
    Resources.falseValue,
    Resources.sourceMapOption
  ];

  private readonly npm: NpmCommand;
  private readonly report: (line: string) => void;
  private readonly root: string;
  private readonly runner: ProcessRunner;

  public constructor(root: string, runner: ProcessRunner, npm: NpmCommand, report: (line: string) => void) {
    this.npm = npm;
    this.report = report;
    this.root = root;
    this.runner = runner;
  }

  public static listCopies(root: string, parts: readonly WorkspacePart[]): readonly PackageCopy[] {
    const filesOf = (folder: string, filter: (file: string) => boolean): readonly string[] => existsSync(path.join(root, folder))
      ? readdirSync(path.join(root, folder), { recursive: true, withFileTypes: true }).filter(t => t.isFile())
        .map(t => path.relative(path.join(root, folder), path.join(t.parentPath, t.name)).replaceAll(path.sep, Resources.pathSeparator)).filter(filter).sort()
      : [];
    return parts.flatMap(part => {
      const copies = [
        Resources.licenseFile,
        ...PackagePacker.MODULE_FILES.filter(t => existsSync(path.join(root, part.folder, t))),
        ...filesOf(path.join(part.folder, part.sources), t => t.endsWith(Resources.scriptExtension)).map(t => path.posix.join(part.sources, t)),
        ...filesOf(path.join(part.folder, Resources.nativeFolder), () => true).map(t => path.posix.join(Resources.nativeFolder, t))
      ];
      return copies.map(t => new PackageCopy(t === Resources.licenseFile ? t : path.posix.join(part.folder, t), part.name, t));
    });
  }

  public async runAsync(parts: readonly WorkspacePart[], commit: string | null = null): Promise<number> {
    let failed = 0;
    for (const part of parts)
      try {
        await this.packAsync(part, commit);
      } catch (error) {
        if (!(error instanceof PackageException))
          throw error;
        this.report(error.message);
        failed++;
      }

    return failed === 0 ? 0 : 1;
  }

  private static manifestOf(text: string, file: string, commit: string | null): string {
    const manifest: unknown = JSON.parse(text);
    if (typeof manifest !== "object" || manifest === null || Array.isArray(manifest))
      throw new ManifestNotObjectException(file);
    const exports: unknown = Object.entries(manifest).find(([field]) => field === Resources.exportsField)?.[1];
    if (typeof exports !== "object" || exports === null || Array.isArray(exports))
      throw new ExportsInvalidException(file);
    const mapped = Object.entries(exports).map(([subpath, target]) => {
      if (target === Resources.manifestExport)
        return [subpath, target] as const;
      if (typeof target !== "string" || !target.endsWith(Resources.sourceExtension) || target.endsWith(Resources.declarationExtension))
        throw new ExportSourceInvalidException(file, subpath);
      const stem = target.slice(0, -Resources.sourceExtension.length);

      return [subpath, { types: `${stem}${Resources.declarationExtension}`, default: `${stem}${Resources.scriptExtension}` }] as const;
    });

    const fields = new Map<string, unknown>(Object.entries(manifest).filter(([field]) => !PackagePacker.UNPACKED_FIELDS.includes(field)));
    fields.set(Resources.exportsField, Object.fromEntries(mapped));
    const own = fields.get(Resources.ownField);
    if (typeof own === "object" && own !== null && !Array.isArray(own)) {
      const version = fields.get(Resources.versionField);
      const rest = new Map<string, unknown>(Object.entries(own));
      for (const [ownField, field] of [[Resources.ownDependenciesField, Resources.dependenciesField], [Resources.ownOptionalDependenciesField, Resources.optionalDependenciesField]] as const) {
        if (!rest.has(ownField))
          continue;
        const names = rest.get(ownField);
        const dependencies = fields.get(field) ?? {};
        if (!Array.isArray(names) || !names.every(t => typeof t === "string") || typeof version !== "string" || typeof dependencies !== "object" || dependencies === null)
          throw new OwnDependenciesInvalidException(file, ownField, field);
        fields.set(field, { ...dependencies, ...Object.fromEntries(names.map(t => [t, version])) });
        rest.delete(ownField);
      }
      if (rest.size === 0)
        fields.delete(Resources.ownField);
      else
        fields.set(Resources.ownField, Object.fromEntries(rest));
    }
    if (commit !== null)
      fields.set(Resources.commitField, commit);

    return Resources.formatLine(JSON.stringify(Object.fromEntries(fields), null, Resources.jsonIndent));
  }

  private async packAsync(part: WorkspacePart, commit: string | null): Promise<void> {
    const source = path.join(this.root, part.folder);
    const sources = path.join(source, part.sources);
    const output = path.join(this.root, ...PackagePacker.workSegments, path.posix.basename(part.folder));
    await rm(output, { recursive: true, force: true });
    const compileArguments = [path.join(this.root, ...PackageBuild.compiler), Resources.projectOption, path.join(sources, Resources.projectFile),
      Resources.rootDirOption, source, Resources.outDirOption, output, ...PackagePacker.COMPILE_ARGUMENTS];
    const compiled = await this.runner.captureAsync(process.execPath, compileArguments, this.root, Resources.compileTimeout);
    if (!compiled.isSuccessful)
      throw new CompilingFailedException(`${part.folder}${Resources.pathSeparator}${part.sources}`, compiled.exitCode, compiled.text);

    for (const file of await readdir(sources, { recursive: true })) {
      const isDeclaration = file.endsWith(Resources.declarationExtension);
      if (!isDeclaration && !file.endsWith(Resources.scriptExtension))
        continue;
      const target = path.join(output, part.sources, file);
      await mkdir(path.dirname(target), { recursive: true });
      if (isDeclaration)
        await writeFile(target, (await readFile(path.join(sources, file), Resources.utf8Encoding)).replace(Resources.declarationImportPattern, Resources.declarationImportReplacement));
      else
        await copyFile(path.join(sources, file), target);
    }
    const native = path.join(source, Resources.nativeFolder);
    if (existsSync(native))
      await cp(native, path.join(output, Resources.nativeFolder), { recursive: true });
    for (const file of PackagePacker.MODULE_FILES.filter(t => existsSync(path.join(source, t))))
      await copyFile(path.join(source, file), path.join(output, file));
    await copyFile(path.join(this.root, Resources.licenseFile), path.join(output, Resources.licenseFile));
    const manifestFile = path.posix.join(part.folder, Resources.manifestFile);
    await writeFile(path.join(output, Resources.manifestFile), PackagePacker.manifestOf(await readFile(path.join(this.root, manifestFile), Resources.utf8Encoding), manifestFile, commit));

    const archives = path.join(this.root, Resources.archivesFolder);
    await mkdir(archives, { recursive: true });
    const packed = await this.npm.runAsync([...PackagePacker.packArguments, archives], output);
    if (!packed.isSuccessful)
      throw new PackingFailedException(part.name, packed.exitCode, packed.text);
  }
}
