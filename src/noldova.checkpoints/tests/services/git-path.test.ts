/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GitPath } from "../../src/services/git-path.ts";

describe("GitPath", { concurrency: true }, () => {
  it("keeps a folder's entries under files/", () => {
    assert.equal(GitPath.ofEntry("src/a.txt"), "files/src/a.txt");
  });

  it("keeps every other name as it is, such as one that only starts or ends like .git, or .git with tildes", () => {
    assert.equal(GitPath.ofEntry("lib/.git~/x"), "files/lib/.git~/x");
    assert.equal(GitPath.ofEntry(".gitignore/.github/x.git/~.git"), "files/.gitignore/.github/x.git/~.git");
  });

  it("keeps the .gitignore a capture followed in a folder under rules/, at that folder's path", () => {
    assert.equal(GitPath.ofRule(""), "rules/.gitignore");
    assert.equal(GitPath.ofRule("vendor/lib"), "rules/vendor/lib/.gitignore");
  });

  it("quotes a path in C style, escaping quotes, backslashes and control characters", () => {
    assert.equal(GitPath.quote("files/a b.txt"), "\"files/a b.txt\"");
    assert.equal(GitPath.quote("say \"hi\"\\now"), "\"say \\\"hi\\\"\\\\now\"");
    assert.equal(GitPath.quote("line\nbreak\ttab\u007f"), "\"line\\012break\\011tab\\177\"");
    assert.equal(GitPath.quote("café"), "\"café\"");
  });
});
