/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { readFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

import { JsonObjectReader, ProtocolException } from "@noldova/checkpoints.protocol";
import { ExceptionOptions } from "@noldova/context.exceptions";
import { ModuleActivationException, PackagedPath } from "@noldova/desktop.runtime";

import { GitManifestInvalidException } from "../exceptions/git-manifest-invalid.exception.ts";
import { GitMissingException } from "../exceptions/git-missing.exception.ts";
import { GitBuild } from "../models/git-build.ts";
import { Resources } from "../resources.ts";
import { Failures } from "./failures.ts";

export class GitBuildLocator {
  private readonly startFolder: string;

  public constructor(startFolder: string) {
    this.startFolder = startFolder;
  }

  public async locateAsync(platform: string, architecture: string): Promise<GitBuild> {
    const packageName = `${Resources.gitPackagePrefix}${Resources.formatGitTarget(platform, architecture)}`;
    const request = `${packageName}${Resources.relativePathSeparator}${Resources.gitPackageManifest}`;
    let manifestFile: string;
    try {
      manifestFile = createRequire(`${this.startFolder}${path.sep}`).resolve(request);
    }
    catch (error) {
      throw GitBuildLocator.refusalOf(packageName, request, error);
    }
    try {
      return await GitBuildLocator.readAsync(manifestFile);
    }
    catch (error) {
      throw GitBuildLocator.unreadableOf(manifestFile, error);
    }
  }

  private static isUnreadable(error: unknown): error is Error {
    return Failures.hasCode(error, Resources.gitUnreadableCodes) || error instanceof ProtocolException;
  }

  private static async programInAsync(program: string, execPath: string): Promise<string> {
    const copy = path.join(execPath, path.basename(program));
    return await Failures.recoverAsync(stat(copy).then(t => t.isFile()), t => Failures.isAbsent(t), false) ? copy : program;
  }

  private static async readAsync(manifestFile: string): Promise<GitBuild> {
    const folder = PackagedPath.unpacked(path.dirname(manifestFile));
    const manifest = new JsonObjectReader(JSON.parse(await readFile(manifestFile, Resources.utf8Encoding)), Resources.gitPackageModel);
    const git = new JsonObjectReader(new JsonObjectReader(manifest.read(Resources.noldovaField), Resources.gitPackageModel).read(Resources.gitField),
      Resources.gitPackageModel);
    const execPath = path.join(folder, git.readString(Resources.gitExecPathField));
    const program = path.join(folder, git.readString(Resources.gitProgramField));
    const paths = git.readStringList(Resources.gitPathField).map(t => path.join(folder, t));
    return new GitBuild(await GitBuildLocator.programInAsync(program, execPath), execPath, paths);
  }

  private static refusalOf(packageName: string, request: string, error: unknown): ModuleActivationException {
    if (!(error instanceof Error && Failures.hasCode(error, Resources.gitNotFoundCodes)))
      return GitBuildLocator.unreadableOf(request, error);
    return new ModuleActivationException(Resources.gitMissingReason, new ExceptionOptions(new GitMissingException(packageName, error)));
  }

  private static unreadableOf(manifestFile: string, error: unknown): ModuleActivationException {
    const invalid = new GitManifestInvalidException(manifestFile, Failures.handled(error, (t: unknown): t is Error => GitBuildLocator.isUnreadable(t)));
    return new ModuleActivationException(Resources.gitUnreadableReason, new ExceptionOptions(invalid));
  }
}
