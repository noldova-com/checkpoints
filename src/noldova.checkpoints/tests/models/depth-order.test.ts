/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DepthOrder } from "../../src/models/depth-order.ts";

describe("DepthOrder", { concurrency: true }, () => {
  it("sorts folders by depth, the shallowest or the deepest first, those of one depth by their bytes, and leaves the list it was given as it was", () => {
    const folders = ["a/b/c", "b", "a/b", "a", "B/x"];

    assert.deepEqual(DepthOrder.ShallowestFirst.sort(folders), ["a", "b", "B/x", "a/b", "a/b/c"]);
    assert.deepEqual(DepthOrder.DeepestFirst.sort(folders), ["a/b/c", "B/x", "a/b", "a", "b"]);
    assert.deepEqual(folders, ["a/b/c", "b", "a/b", "a", "B/x"]);
  });
});
