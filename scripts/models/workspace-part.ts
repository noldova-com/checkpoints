/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class WorkspacePart {
  public readonly expectedName: string;
  public readonly folder: string;
  public readonly name: string;
  public readonly sources: string;

  public constructor(name: string, expectedName: string, folder: string, sources: string) {
    this.expectedName = expectedName;
    this.folder = folder;
    this.name = name;
    this.sources = sources;
  }
}
