/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { existsSync } from "node:fs";
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type { GitBuilds } from "../models/git-builds.ts";
import { Resources } from "../resources.ts";
import { BuildArchive } from "./build-archive.ts";
import type { GitPackageBuild } from "./git-package-build.ts";

export class GitBuildLister {
  private readonly builds: GitBuilds;
  private readonly packages: GitPackageBuild;
  private readonly output: string;
  private readonly report: (line: string) => void;

  public constructor(builds: GitBuilds, packages: GitPackageBuild, output: string, report: (line: string) => void) {
    this.builds = builds;
    this.packages = packages;
    this.output = output;
    this.report = report;
  }

  public async listAsync(): Promise<void> {
    await rm(this.output, { recursive: true, force: true });
    await mkdir(path.join(this.output, Resources.listingsFolder), { recursive: true });
    for (const target of this.builds.targets) {
      const folder = path.join(this.output, Resources.listedBuildFolder, target.target);
      const build = await new BuildArchive(folder, [], target.program, target.execPath).unpackAsync(await this.packages.readArchiveAsync(target), target.kind);
      await writeFile(path.join(this.output, Resources.listingsFolder, Resources.formatTargetTextFile(target.target)), Resources.formatLine(build.listing.join(Resources.lineFeed)));

      const versions = path.join(folder, ...Resources.packageVersionsFile.split(Resources.pathSeparator));
      if (existsSync(versions)) {
        await mkdir(path.join(this.output, Resources.packageVersionsFolder), { recursive: true });
        await copyFile(versions, path.join(this.output, Resources.packageVersionsFolder, Resources.formatTargetTextFile(target.target)));
      }
      this.report(Resources.formatTargetListed(target.target, build.listing.length, target.url));
    }
  }
}
