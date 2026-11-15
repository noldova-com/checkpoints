/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import type { WorkspaceLayout } from "./workspace-layout.ts";

export class PackageBuild {
  public static readonly compiler: readonly string[] = [Resources.nodeModulesFolder, Resources.typeScriptPackage, Resources.binFolder, Resources.compilerProgram];

  private readonly layout: WorkspaceLayout;
  private readonly report: (line: string) => void;

  public constructor(layout: WorkspaceLayout, report: (line: string) => void) {
    this.layout = layout;
    this.report = report;
  }

  public async runAsync(): Promise<number> {
    const parts = await this.layout.readPartsAsync();
    const misnamed = parts.filter(t => t.name !== t.expectedName);
    for (const part of misnamed)
      this.report(Resources.formatPackageMisnamed(part.folder, part.name, part.expectedName));

    return misnamed.length === 0 ? 0 : 1;
  }
}
