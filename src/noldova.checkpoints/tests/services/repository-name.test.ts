/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RepositoryName } from "../../src/services/repository-name.ts";

describe("RepositoryName", { concurrency: true }, () => {
  it("matches every name Git's NTFS and HFS+ rules treat as .git", () => {
    const names = [".git", ".GIT", ".Git", "git~1", "GIT~1", ".git.", ".git ", ".git. .", "git~1 ", ".git::$INDEX_ALLOCATION", "git~1:stream",
      ".g\u200Cit", "\uFEFF.git", ".gi\u206At", ".G\u202AIT", "\u200F.git\u200D"];

    assert.deepEqual(names.filter(t => !RepositoryName.matches(t)), []);
  });

  it("keeps every other name, however close to .git", () => {
    const names = [".gitignore", ".git~", ".gitx", ".git.x", "git", "git~2", "git~10", ".git-", "x.git", "mirror.git", "GIT~1x", ".g\u00A0it",
      ".g\u2060it", "\u0130.git"];

    assert.deepEqual(names.filter(t => RepositoryName.matches(t)), []);
  });
});
