/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RelativePath } from "../../src/services/relative-path.ts";

describe("RelativePath", { concurrency: true }, () => {
  it("takes a path of non-empty names joined by \"/\", dots inside names included", () => {
    for (const path of ["a", "src/a.ts", ".git", "a/.b/c..d", "..a", "a/b./c"])
      assert.equal(RelativePath.isValid(path), true);
  });

  it("refuses an empty name, \".\" or \"..\" anywhere in the path", () => {
    for (const path of ["", "/a", "a/", "a//b", ".", "..", "./a", "a/../b", "a/."])
      assert.equal(RelativePath.isValid(path), false);
  });
});
