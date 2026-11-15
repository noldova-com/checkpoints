/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { existsSync } from "node:fs";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { ConsumerArchiveMissingException } from "../exceptions/consumer-archive-missing.exception.ts";
import { ConsumerInstallFailedException } from "../exceptions/consumer-install-failed.exception.ts";
import type { WorkspacePart } from "../models/workspace-part.ts";
import { Resources } from "../resources.ts";
import type { NpmCommand } from "./npm-command.ts";

export class ConsumerProject {
  private readonly npm: NpmCommand;
  private readonly root: string;

  public constructor(root: string, npm: NpmCommand) {
    this.npm = npm;
    this.root = root;
  }

  public get folder(): string {
    return path.join(this.root, Resources.buildWorkFolder, Resources.consumerFolder);
  }

  public async installAsync(parts: readonly WorkspacePart[]): Promise<void> {
    const peers = path.join(this.root, Resources.buildWorkFolder, Resources.consumerPeersFolder);
    for (const folder of [this.folder, peers]) {
      await rm(folder, { recursive: true, force: true });
      await mkdir(folder, { recursive: true });
    }
    await writeFile(path.join(this.folder, Resources.manifestFile), Resources.consumerManifest);
    const archivesFolder = path.join(this.root, Resources.archivesFolder);
    const archives = existsSync(archivesFolder) ? await readdir(archivesFolder) : [];
    const installed = parts.map(t => {
      const prefix = Resources.formatArchivePrefix(t.name);
      const found = archives.filter(u => u.startsWith(prefix) && u.endsWith(Resources.archiveExtension));
      if (found.length !== 1)
        throw new ConsumerArchiveMissingException(t.name);
      return path.join(this.root, Resources.archivesFolder, ...found);
    });
    for (const name of Resources.consumerPeers)
      await this.runAsync([Resources.packCommand, Resources.ignoreScriptsOption, Resources.errorLogLevelOption, Resources.packDestinationOption, peers,
        path.join(this.root, Resources.nodeModulesFolder, ...name.split(Resources.pathSeparator))]);
    const packed = (await readdir(peers)).map(t => path.join(peers, t));
    await this.runAsync([...Resources.consumerInstallArguments, ...installed, ...packed]);
  }

  private async runAsync(npmArguments: readonly string[]): Promise<void> {
    const result = await this.npm.runAsync(npmArguments, this.folder);
    if (!result.isSuccessful)
      throw new ConsumerInstallFailedException(result.exitCode, result.text);
  }
}
