/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { GitTarget } from "./git-target.ts";
import { Resources } from "../resources.ts";

export class GitBuildSource {
  public static readonly all: readonly GitBuildSource[] = [
    new GitBuildSource(Resources.minGitSourceName, Resources.minGitRepository),
    new GitBuildSource(Resources.dugiteSourceName, Resources.dugiteRepository)
  ];

  public readonly name: string;
  public readonly repository: string;

  public constructor(name: string, repository: string) {
    this.name = name;
    this.repository = repository;
  }

  public tagOf(target: GitTarget): string | null {
    const prefix = Resources.formatReleaseDownloadPrefix(this.repository);
    if (!target.url.startsWith(prefix))
      return null;
    const tag = String(target.url.slice(prefix.length).split(Resources.pathSeparator)[0]);
    return tag === "" ? null : tag;
  }
}
