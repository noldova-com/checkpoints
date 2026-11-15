/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from "node:path";

import { ProcessRunner } from "./services/process-runner.ts";
import { TestRun } from "./services/test-run.ts";
import { WorkspaceLayout } from "./services/workspace-layout.ts";

const root = path.dirname(import.meta.dirname);
process.exitCode = await new TestRun(root, new WorkspaceLayout(root), new ProcessRunner(), line => console.error(line)).runAsync(process.argv.slice(2));
