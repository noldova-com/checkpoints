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
  it("takes 1 to 64 letters, digits or hyphens", () => {
    for (const identity of ["a", "project-1", "A".repeat(64), "-"])
      assert.doesNotThrow(() => FolderIdentity.check(identity));
  });

  it("refuses an empty identity, a longer one, or any other character", () => {
    for (const identity of ["", "A".repeat(65), "a_b", "a b", "é", "a/b"])
      assert.throws(() => FolderIdentity.check(identity), new InvalidIdentityException(identity));
  });
});
