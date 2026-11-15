/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class PinnedTag {
  public readonly reportedVersion: string | null;
  public readonly tag: string;
  public readonly target: string;

  public constructor(target: string, tag: string, reportedVersion: string | null) {
    this.reportedVersion = reportedVersion;
    this.tag = tag;
    this.target = target;
  }
}
