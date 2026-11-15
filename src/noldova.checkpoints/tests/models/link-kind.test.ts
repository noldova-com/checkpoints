/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { UnknownLinkKindException } from "../../src/api/index.ts";
import { LinkKind } from "../../src/models/link-kind.ts";

describe("LinkKind", { concurrency: true }, () => {
  it("reads each kind back from its value", () => {
    assert.equal(LinkKind.fromJson(LinkKind.File.toJson()), LinkKind.File);
    assert.equal(LinkKind.fromJson(LinkKind.Folder.toJson()), LinkKind.Folder);
    assert.deepEqual([LinkKind.File.toJson(), LinkKind.Folder.toJson()], ["File", "Folder"]);
  });

  it("refuses a value that names no kind", () => {
    assert.throws(() => LinkKind.fromJson("Junction"), new UnknownLinkKindException("Junction"));
  });
});
