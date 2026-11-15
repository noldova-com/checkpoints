/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { existsSync } from "node:fs";
import path from "node:path";

import { Resources } from "./resources.ts";
import { Git } from "./services/git.ts";
import { NpmCommand } from "./services/npm-command.ts";
import { PackageBuild } from "./services/package-build.ts";
import { PackagePacker } from "./services/package-packer.ts";
import { ProcessRunner } from "./services/process-runner.ts";
import { Release } from "./services/release.ts";
import { WorkspaceBuild } from "./services/workspace-build.ts";
import { WorkspaceLayout } from "./services/workspace-layout.ts";

const root = path.dirname(import.meta.dirname);
const layout = new WorkspaceLayout(root);
const runner = new ProcessRunner();
const npm = new NpmCommand(runner, process.env);
const report = (line: string): void => console.error(line);
const options = process.argv.slice(2);
if (options.includes(Resources.listCopiesOption)) {
  if (options.length !== 1) {
    report(Resources.formatTakesNoOtherOption(Resources.listCopiesOption));
    process.exitCode = 1;
  }
  else {
    for (const copy of PackagePacker.listCopies(root, await layout.readPartsAsync()))
      process.stdout.write(Resources.formatLine([copy.source, copy.packageName, copy.path].join(Resources.columnSeparator)));
    process.stdout.write(Resources.endOfCopiesLine);
  }
}
else if (!existsSync(path.join(root, Resources.nodeModulesFolder)) && (process.env[Resources.npmPathVariable] ?? "").length === 0) {
  report(Resources.runThroughNpmMessage);
  process.exitCode = 1;
}
else {
  const installed = existsSync(path.join(root, Resources.nodeModulesFolder))
    ? 0
    : await runner.runAsync(process.execPath, [process.env[Resources.npmPathVariable] ?? "", Resources.ciCommand, Resources.noAuditOption, Resources.noFundOption], root,
      Resources.npmTimeout);
  const checkReleaseAsync = (version: string, commit: string): Promise<number> =>
    new Release(root, runner, process.env, process.stdout).runAsync([Resources.checkCommand, Resources.archivesFolder, version, commit]);
  const checked = installed !== 0 ? installed : await new PackageBuild(layout, report).runAsync();
  process.exitCode = checked !== 0
    ? checked
    : await new WorkspaceBuild(root, layout, new PackagePacker(root, runner, npm, report), npm, process.env, Resources.formatHostTarget(process.platform, process.arch), report,
      checkReleaseAsync, async () => (existsSync(path.join(root, Resources.gitFolderName)) ? await new Git(root, runner).readCleanHeadAsync() : null)).runAsync();
}
