/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InvalidRelativePathException } from "@noldova/checkpoints.protocol";

import { ScopePaths } from "../../src/services/scope-paths.ts";

describe("ScopePaths", { concurrency: true }, () => {
  it("keeps null as the whole folder, and its own copy of the paths it was given", () => {
    const paths = ["src/a.txt", "docs"];
    const scope = ScopePaths.of(paths);
    paths.length = 0;

    assert.equal(ScopePaths.of(null), null);
    assert.deepEqual(scope, ["src/a.txt", "docs"]);
    assert.deepEqual(ScopePaths.of([]), []);
  });

  it("refuses a path with an empty name, \".\" or \"..\", or one holding \"\\\" on every system", () => {
    for (const path of ["", "/a", "a/", "a//b", "./a", "a/../b", "a\\b", "\\a", "a\\"])
      assert.throws(() => ScopePaths.of(["ok.txt", path]), new InvalidRelativePathException(path));
  });

  it("writes null as null and the paths as a list of their own", () => {
    const paths = ["a.txt"];
    const json = ScopePaths.toJson(paths);
    paths.length = 0;

    assert.equal(ScopePaths.toJson(null), null);
    assert.deepEqual(json, ["a.txt"]);
  });
});
