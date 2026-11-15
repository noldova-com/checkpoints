/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CheckpointsException, GitManifestInvalidException, GitMissingException, GitStoppedException, UnknownEntryKindException } from "../../src/api/index.ts";
import { RestorePathChangedException } from "../../src/exceptions/restore-path-changed.exception.ts";

describe("CheckpointsException", { concurrency: true }, () => {
  it("is the base of every exception the module throws, each named by its class", () => {
    const errors = [
      new GitMissingException("@noldova/checkpoints.git.linux-x64", new Error("Cannot find package")),
      new GitManifestInvalidException("/app/git/package.json", new SyntaxError("Unexpected end of JSON input")),
      new GitStoppedException("cat-file", ""),
      new UnknownEntryKindException("Socket"),
      new RestorePathChangedException("a.txt")
    ];

    assert.deepEqual(errors.map(t => t.name), ["GitMissingException", "GitManifestInvalidException", "GitStoppedException", "UnknownEntryKindException", "RestorePathChangedException"]);
    assert.ok(errors.every(t => t instanceof CheckpointsException && t instanceof Error));
  });
});
