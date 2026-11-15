/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { UnreadPath, UnreadReason } from "@noldova/checkpoints.protocol";

import { WalkResult } from "../../src/models/walk-result.ts";
import { NameDecoder } from "../../src/services/name-decoder.ts";

describe("NameDecoder", { concurrency: true }, () => {
  it("keeps names that are valid Unicode, a leading byte order mark included", () => {
    const result = new WalkResult(null);
    const names = NameDecoder.decode([Buffer.from("café"), Buffer.from("﻿bom.txt")], "", result);

    assert.deepEqual(names, ["café", "﻿bom.txt"]);
    assert.deepEqual(result.unreadPaths, []);
  });

  it("lists each other name as InvalidName, under its folder, shown with replacement characters", () => {
    const result = new WalkResult(null);
    const names = NameDecoder.decode([Buffer.from([0x61, 0xff]), Buffer.from("b"), Buffer.from([0x63, 0xed, 0xa0, 0x80])], "src", result);

    assert.deepEqual(names, ["b"]);
    assert.deepEqual(result.unreadPaths, [
      new UnreadPath("src/a�", UnreadReason.InvalidName, null),
      new UnreadPath("src/c���", UnreadReason.InvalidName, null)
    ]);
  });
});
