/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from "node:path";

import { GitBuildCheck } from "./services/git-build-check.ts";

process.exitCode = await new GitBuildCheck(path.dirname(import.meta.dirname), process.env, process.stdout).runAsync();
