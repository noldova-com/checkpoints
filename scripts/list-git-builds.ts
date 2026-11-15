/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from "node:path";

import { Resources } from "./resources.ts";
import { GitBuildLister } from "./services/git-build-lister.ts";
import { GitPackageBuild } from "./services/git-package-build.ts";
import { NpmCommand } from "./services/npm-command.ts";
import { ProcessRunner } from "./services/process-runner.ts";
import { WorkspaceLayout } from "./services/workspace-layout.ts";

const root = path.dirname(import.meta.dirname);
const builds = await new WorkspaceLayout(root).readBuildsAsync();
const report = (line: string): void => console.error(line);
const packages = new GitPackageBuild(root, builds, new NpmCommand(new ProcessRunner(), process.env), report);
await new GitBuildLister(builds, packages, path.join(root, Resources.buildWorkFolder, Resources.gitListsFolder), report).listAsync();
