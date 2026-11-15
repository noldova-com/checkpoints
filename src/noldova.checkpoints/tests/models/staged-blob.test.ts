/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PathKind } from "@noldova/checkpoints.protocol";

import { LinkKind } from "../../src/models/link-kind.ts";
import { StagedBlob } from "../../src/models/staged-blob.ts";

describe("StagedBlob", { concurrency: true }, () => {
  it("holds the object to stage, where to write it, its kind and the kind of link it makes", () => {
    const blob = new StagedBlob("a".repeat(40), "/project/.~r1/0", PathKind.Link, LinkKind.Folder);

    assert.deepEqual([blob.objectId, blob.location, blob.kind, blob.linkKind], ["a".repeat(40), "/project/.~r1/0", PathKind.Link, LinkKind.Folder]);
  });

  it("holds no link kind for a staged file", () => {
    const blob = new StagedBlob("b".repeat(40), "/project/.~r1/1", PathKind.Executable, null);

    assert.deepEqual([blob.kind, blob.linkKind], [PathKind.Executable, null]);
  });
});
