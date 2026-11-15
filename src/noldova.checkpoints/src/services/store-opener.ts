/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { FolderStore } from "../models/folder-store.ts";
import { Resources } from "../resources.ts";
import { Failures } from "./failures.ts";
import type { GitRunner } from "./git-runner.ts";

export class StoreOpener {
  private readonly git: GitRunner;

  public constructor(git: GitRunner) {
    this.git = git;
  }

  public static async existsAsync(store: FolderStore): Promise<boolean> {
    return await Failures.recoverAsync(access(store.headFile).then(() => true), t => Failures.codeOf(t) === Resources.missingCode, false);
  }

  public async openAsync(store: FolderStore, signal: AbortSignal): Promise<void> {
    await mkdir(store.hooksFolder, { recursive: true });
    await writeFile(store.emptyFile, "");
    await mkdir(store.folder, { recursive: true });
    if (!await StoreOpener.existsAsync(store))
      await this.git.runAsync(store, Resources.initCommand, Resources.initArguments, "", signal);
    await mkdir(path.dirname(store.attributesFile), { recursive: true });
    await writeFile(store.configFile, Resources.formatGitConfig(store.hooksFolder, store.emptyFile));
    await writeFile(store.attributesFile, Resources.attributesText);
  }
}
