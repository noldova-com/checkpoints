/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GitBuild } from "../../src/models/git-build.ts";

describe("GitBuild", { concurrency: true }, () => {
  it("keeps its program, its commands' folder and a copy of its path", () => {
    const folders = ["/git/bin"];
    const build = new GitBuild("/git/bin/git", "/git/libexec/git-core", folders);
    folders.push("/elsewhere");

    assert.equal(build.program, "/git/bin/git");
    assert.equal(build.execPath, "/git/libexec/git-core");
    assert.deepEqual(build.path, ["/git/bin"]);
  });
});
