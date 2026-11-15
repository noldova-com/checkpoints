/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { UnhashedFile } from "../../src/models/unhashed-file.ts";

describe("UnhashedFile", { concurrency: true }, () => {
  it("holds a file found in the folder now by where it is and its file id, before its content is hashed", () => {
    const file = new UnhashedFile("/work/project/a.txt", "5:9");

    assert.deepEqual([file.location, file.fileId], ["/work/project/a.txt", "5:9"]);
  });
});
