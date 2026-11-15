/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { UnknownFieldException } from "@noldova/checkpoints.protocol";

import { LinkKind } from "../../src/models/link-kind.ts";
import { LinkRecord } from "../../src/models/link-record.ts";

describe("LinkRecord", { concurrency: true }, () => {
  it("writes and reads a link's path and kind", () => {
    const json = new LinkRecord("build/out", LinkKind.Folder).toJson();
    const record = LinkRecord.fromJson(json);

    assert.deepEqual(json, { path: "build/out", linkKind: "Folder" });
    assert.equal(record.path, "build/out");
    assert.equal(record.linkKind, LinkKind.Folder);
  });

  it("refuses a field it doesn't know", () => {
    assert.throws(() => LinkRecord.fromJson({ path: "a", linkKind: "File", target: "b" }), new UnknownFieldException("LinkRecord", "target"));
  });
});
