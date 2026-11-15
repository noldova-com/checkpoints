/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PathKind, UnknownPathKindException } from "@noldova/checkpoints.protocol";

describe("PathKind", { concurrency: true }, () => {
  it("writes and reads each kind by its name", () => {
    const kinds = [PathKind.File, PathKind.Executable, PathKind.Link, PathKind.Folder];

    assert.deepEqual(kinds.map(t => t.toJson()), ["File", "Executable", "Link", "Folder"]);
    assert.deepEqual(kinds.map(t => PathKind.fromJson(t.value)), kinds);
  });

  it("refuses a name it doesn't know", () => {
    assert.throws(() => PathKind.fromJson("Socket"), new UnknownPathKindException("Socket"));
  });
});
