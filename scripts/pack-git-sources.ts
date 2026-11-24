/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from "node:path";

import { GitSourcePacker } from "./services/git-source-packer.ts";
import { WorkspaceLayout } from "./services/workspace-layout.ts";

const root = path.dirname(import.meta.dirname);
const builds = await new WorkspaceLayout(root).readBuildsAsync();
await new GitSourcePacker(root, builds.sources, line => console.error(line)).packAsync();
