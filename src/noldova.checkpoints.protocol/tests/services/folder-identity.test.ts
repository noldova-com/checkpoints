/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InvalidIdentityException } from "@noldova/checkpoints.protocol";

import { FolderIdentity } from "../../src/services/folder-identity.ts";

describe("FolderIdentity", { concurrency: true }, () => {
  it("takes 1 to 64 lower-case letters, digits or hyphens", () => {
    for (const identity of ["a", "project-1", "a".repeat(64), "-"])
      assert.doesNotThrow(() => FolderIdentity.check(identity));
  });

  it("refuses an empty identity, a longer one, an upper-case letter, or any other character", () => {
    for (const identity of ["", "a".repeat(65), "A", "Project-1", "a_b", "a b", "é", "a/b"])
      assert.throws(() => FolderIdentity.check(identity), new InvalidIdentityException(identity));
  });
});
