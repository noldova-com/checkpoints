/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { GitBuildSource } from "./git-build-source.ts";
import type { GitRelease } from "./git-release.ts";
import type { PinnedTag } from "./pinned-tag.ts";

export class NewerRelease {
  public readonly older: readonly PinnedTag[];
  public readonly release: GitRelease;
  public readonly source: GitBuildSource;

  public constructor(source: GitBuildSource, release: GitRelease, older: readonly PinnedTag[]) {
    this.older = older;
    this.release = release;
    this.source = source;
  }
}
