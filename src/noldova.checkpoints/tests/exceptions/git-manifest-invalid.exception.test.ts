/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CheckpointsException, GitManifestInvalidException } from "../../src/api/index.ts";

describe("GitManifestInvalidException", { concurrency: true }, () => {
  it("names the manifest and says why it can't be read, keeping the failure", () => {
    const cause = new SyntaxError("Unexpected end of JSON input");
    const error = new GitManifestInvalidException("/app/git/package.json", cause);

    assert.equal(error.name, "GitManifestInvalidException");
    assert.equal(error.message, "The Git build's manifest /app/git/package.json can't be read: Unexpected end of JSON input");
    assert.equal(error.manifestFile, "/app/git/package.json");
    assert.equal(error.cause, cause);
    assert.ok(error instanceof CheckpointsException);
  });
});
