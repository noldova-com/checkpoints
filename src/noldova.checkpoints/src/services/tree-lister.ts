/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { FolderStore } from "../models/folder-store.ts";
import { TreeListing } from "../models/tree-listing.ts";
import { Resources } from "../resources.ts";
import type { GitRunner } from "./git-runner.ts";

export class TreeLister {
  private readonly git: GitRunner;

  public constructor(git: GitRunner) {
    this.git = git;
  }

  public async listAsync(store: FolderStore, commit: string, signal: AbortSignal): Promise<TreeListing> {
    const output = await this.git.runAsync(store, Resources.diffTreeCommand, [...Resources.diffTreeArguments, Resources.emptyTreeId, commit], "", signal);
    return TreeListing.parse(output.toString(Resources.utf8Encoding));
  }
}
