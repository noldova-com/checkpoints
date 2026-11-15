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
  it("joins a name to a folder's path with \"/\", whatever the system's separator, and a name at the top stands alone", () => {
    assert.equal(RelativePath.join("", "a.txt"), "a.txt");
    assert.equal(RelativePath.join("src/lib", "a.txt"), "src/lib/a.txt");
  });

  it("gives the folder that holds a path, and \"\" for one at the top", () => {
    assert.equal(RelativePath.parentOf("src/lib/a.txt"), "src/lib");
    assert.equal(RelativePath.parentOf("a.txt"), "");
  });
});
