/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ImportResult } from "../../src/models/import-result.ts";

describe("ImportResult", { concurrency: true }, () => {
  it("holds what the import's writer gave and the commit fast-import made, or none where it stopped", () => {
    const made = new ImportResult("written", "0123456789abcdef0123456789abcdef01234567");
    const stopped = new ImportResult(5, null);

    assert.deepEqual([made.written, made.commit, stopped.written, stopped.commit], ["written", "0123456789abcdef0123456789abcdef01234567", 5, null]);
  });
});
